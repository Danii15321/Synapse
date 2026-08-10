import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { participationMutationSchema } from "@/lib/validators/inscription"
import { jeuSlugParamsSchema } from "@/lib/validators/jeu"
import { enforceAuthMutationSecurity } from "@/server/auth/request-security"
import { requireUser } from "@/server/auth/require-user"
import {
  mapDomainError,
  UnauthorizedError,
  ValidationError,
} from "@/server/errors"
import { writeLog } from "@/server/logger"
import {
  cancelJeuParticipation,
  participateInJeu,
} from "@/server/services/inscription-service"
import { parseJsonBody } from "@/server/validation/parse-json-body"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."
type RouteContext = Readonly<{ params: Promise<{ slug: string }> }>

function hasName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

function errorResponse(
  request: Request,
  error: unknown,
  startedAt: number,
  securityFailure = false,
): NextResponse {
  const errorId = randomUUID()
  const status = securityFailure ? 403 : mapDomainError(error).status
  writeLog({
    durationMs: Date.now() - startedAt,
    errorId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    method: request.method,
    route: new URL(request.url).pathname,
    status,
  })
  return NextResponse.json(
    { errorId, message: GENERIC_ERROR_MESSAGE },
    { status },
  )
}

async function secureMutation(request: Request): Promise<void> {
  try {
    await enforceAuthMutationSecurity(request, new URL(request.url).pathname)
  } catch (error) {
    if (
      error instanceof UnauthorizedError ||
      hasName(error, "UnauthorizedError")
    ) {
      throw new ValidationError("FORBIDDEN_ORIGIN")
    }
    throw error
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    await secureMutation(request)
    const parsedParams = jeuSlugParamsSchema.safeParse(await params)
    if (!parsedParams.success) throw new ValidationError("Route invalide")
    const browserForm = request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
    const input = browserForm
      ? Object.fromEntries(await request.formData())
      : await parseJsonBody(request, participationMutationSchema)
    participationMutationSchema.parse(input)
    const confirmation = await participateInJeu(
      parsedParams.data.slug,
      await requireUser(),
    )
    if (browserForm) {
      return NextResponse.redirect(
        new URL(`/jeux/${parsedParams.data.slug}`, request.url),
        303,
      )
    }
    return NextResponse.json(confirmation, {
      status: confirmation.status === "CREATED" ? 201 : 200,
    })
  } catch (error) {
    const securityFailure =
      error instanceof ValidationError && error.message === "FORBIDDEN_ORIGIN"
    return errorResponse(request, error, startedAt, securityFailure)
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    await secureMutation(request)
    const parsedParams = jeuSlugParamsSchema.safeParse(await params)
    const parsedQuery = participationMutationSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsedParams.success || !parsedQuery.success) {
      throw new ValidationError("Route invalide")
    }
    await cancelJeuParticipation(parsedParams.data.slug, await requireUser())
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    const securityFailure =
      error instanceof ValidationError && error.message === "FORBIDDEN_ORIGIN"
    return errorResponse(request, error, startedAt, securityFailure)
  }
}
