import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { loginSchema } from "@/lib/validators/auth"
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/server/auth/session-cookie"
import { enforceAuthMutationSecurity } from "@/server/auth/request-security"
import { mapDomainError, UnauthorizedError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { createCredentialSession } from "@/server/services/credential-session-service"
import { parseJsonBody } from "@/server/validation/parse-json-body"

const GENERIC_ERROR_MESSAGE = "Connexion impossible."

function hasName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    await enforceAuthMutationSecurity(
      request,
      "/api/auth/callback/credentials",
    )
    const input = loginSchema.parse(await parseJsonBody(request, loginSchema))
    const session = await createCredentialSession(input)
    if (!session) {
      return NextResponse.json({ message: GENERIC_ERROR_MESSAGE }, { status: 401 })
    }

    const response = NextResponse.json({ message: "Connexion réussie." })
    response.cookies.set({
      expires: session.expires,
      httpOnly: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: true,
      value: session.sessionToken,
    })
    return response
  } catch (error) {
    const errorId = randomUUID()
    const forbidden =
      error instanceof UnauthorizedError || hasName(error, "UnauthorizedError")
    const status = forbidden ? 403 : mapDomainError(error).status
    writeLog({
      durationMs: Date.now() - startedAt,
      errorId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      route: "/api/auth/callback/credentials",
      status,
    })
    return NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
  }
}
