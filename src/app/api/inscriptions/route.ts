import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { participationListQuerySchema } from "@/lib/validators/inscription"
import { requireUser } from "@/server/auth/require-user"
import { mapDomainError, ValidationError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getMyParticipations } from "@/server/services/inscription-service"

export const dynamic = "force-dynamic"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function GET(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    const parsed = participationListQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsed.success) throw new ValidationError("Pagination invalide")
    return NextResponse.json(
      await getMyParticipations(parsed.data, await requireUser()),
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
