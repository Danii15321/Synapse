import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { formationSlugParamsSchema } from "@/lib/validators/formation"
import { auth } from "@/server/auth/config"
import { mapDomainError, ValidationError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getFormationBySlug } from "@/server/services/formation-service"

export const dynamic = "force-dynamic"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

type RouteContext = Readonly<{ params: Promise<{ slug: string }> }>

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    const parsedParams = formationSlugParamsSchema.safeParse(await params)
    if (!parsedParams.success) {
      throw new ValidationError("Paramètres de route invalides")
    }
    const session = await auth()
    const formation = await getFormationBySlug(
      parsedParams.data.slug,
      session?.user ?? null,
    )
    return NextResponse.json(formation)
  } catch (error) {
    const errorId = randomUUID()
    const { status } = mapDomainError(error)
    writeLog({
      durationMs: Date.now() - startedAt,
      error: { name: error instanceof Error ? error.name : "UnknownError" },
      errorId,
      method: request.method,
      route: new URL(request.url).pathname,
      status,
    })
    return NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
  }
}

