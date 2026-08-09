import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { jeuSlugParamsSchema } from "@/lib/validators/jeu"
import { auth } from "@/server/auth/config"
import { mapDomainError, ValidationError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getJeuBySlug } from "@/server/services/jeu-service"

export const dynamic = "force-dynamic"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."
type RouteContext = Readonly<{ params: Promise<{ slug: string }> }>

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    const parsed = jeuSlugParamsSchema.safeParse(await params)
    if (!parsed.success) throw new ValidationError("Paramètres invalides")
    const session = await auth()
    return NextResponse.json(
      await getJeuBySlug(parsed.data.slug, session?.user ?? null),
    )
  } catch (error) {
    const errorId = randomUUID()
    const { status } = mapDomainError(error)
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
}
