import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { signOut } from "@/server/auth/config"
import { enforceAuthMutationSecurity } from "@/server/auth/request-security"
import {
  mapDomainError,
  RateLimitedError,
  UnauthorizedError,
} from "@/server/errors"
import { writeLog } from "@/server/logger"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    await enforceAuthMutationSecurity(request, "/api/auth/logout")
    await signOut({ redirect: false })

    return NextResponse.redirect(new URL("/", request.url), 303)
  } catch (error) {
    const errorId = randomUUID()
    const invalidOrigin =
      error instanceof UnauthorizedError ||
      (error instanceof Error && error.name === "UnauthorizedError")
    const status = invalidOrigin ? 403 : mapDomainError(error).status

    writeLog({
      durationMs: Date.now() - startedAt,
      errorId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      route: "/api/auth/logout",
      status,
    })

    const response = NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
    if (error instanceof RateLimitedError) {
      response.headers.set("Retry-After", String(error.retryAfterSeconds))
    }
    return response
  }
}
