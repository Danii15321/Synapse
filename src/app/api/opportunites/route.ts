import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { opportuniteListQuerySchema } from "@/lib/validators/opportunite"
import { mapDomainError, ValidationError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getOpportunites } from "@/server/services/opportunite-service"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    const rawQuery = Object.fromEntries(new URL(request.url).searchParams)
    const parsedQuery = opportuniteListQuerySchema.safeParse(rawQuery)
    if (!parsedQuery.success) {
      throw new ValidationError("Paramètres de requête invalides")
    }

    return NextResponse.json(await getOpportunites(parsedQuery.data))
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
