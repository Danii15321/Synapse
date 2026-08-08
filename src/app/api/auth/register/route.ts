import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { registerSchema } from "@/lib/validators/auth"
import { enforceAuthMutationSecurity } from "@/server/auth/request-security"
import {
  AccountAlreadyExistsError,
  mapDomainError,
  UnauthorizedError,
} from "@/server/errors"
import { writeLog } from "@/server/logger"
import { registerUser } from "@/server/services/auth-service"
import { parseJsonBody } from "@/server/validation/parse-json-body"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."
const REGISTER_RESPONSE = { message: "Inscription prise en compte." }

function hasName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now()

  try {
    await enforceAuthMutationSecurity(request, "/api/auth/register")
    const input = registerSchema.parse(
      await parseJsonBody(request, registerSchema),
    )
    await registerUser(input)
    return NextResponse.json(REGISTER_RESPONSE, { status: 201 })
  } catch (error) {
    if (
      error instanceof AccountAlreadyExistsError ||
      hasName(error, "AccountAlreadyExistsError")
    ) {
      return NextResponse.json(REGISTER_RESPONSE, { status: 201 })
    }

    const errorId = randomUUID()
    const forbidden =
      error instanceof UnauthorizedError || hasName(error, "UnauthorizedError")
    const status = forbidden ? 403 : mapDomainError(error).status

    writeLog({
      durationMs: Date.now() - startedAt,
      errorId,
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      route: "/api/auth/register",
      status,
    })

    return NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
  }
}
