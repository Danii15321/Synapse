import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { jeuListQuerySchema } from "@/lib/validators/jeu"
import { mapDomainError, ValidationError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getJeux } from "@/server/services/jeu-service"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    const parsed = jeuListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsed.success) throw new ValidationError("Pagination invalide")
    return NextResponse.json(await getJeux(parsed.data))
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
