import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { requireUser } from "@/server/auth/require-user"
import { mapDomainError, UnauthorizedError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { getAccount } from "@/server/services/auth-service"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser()
    return NextResponse.json(getAccount(user))
  } catch (error) {
    const errorId = randomUUID()
    const status =
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
        ? 401
        : mapDomainError(error).status
    writeLog({
      errorId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      route: "/api/auth/account",
      status,
    })
    return NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
  }
}
