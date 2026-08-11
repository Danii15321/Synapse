import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import {
  accountProfileSchema,
  deleteAccountSchema,
} from "@/lib/validators/auth"
import { enforceAuthMutationSecurity } from "@/server/auth/request-security"
import { requireUser } from "@/server/auth/require-user"
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie"
import { mapDomainError, UnauthorizedError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import {
  deleteAccount,
  getAccount,
  updateProfile,
} from "@/server/services/auth-service"
import { parseJsonBody } from "@/server/validation/parse-json-body"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."
const ACCOUNT_ROUTE = "/api/auth/account"

function hasName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

function errorResponse(
  request: Request,
  error: unknown,
  statusOverride?: number,
): NextResponse {
  const errorId = randomUUID()
  const status = statusOverride ?? mapDomainError(error).status
  writeLog({
    errorId,
    errorName: error instanceof Error ? error.name : "UnknownError",
    method: request.method,
    route: ACCOUNT_ROUTE,
    status,
  })
  return NextResponse.json(
    { errorId, message: GENERIC_ERROR_MESSAGE },
    { status },
  )
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser()
    return NextResponse.json(await getAccount(user.id))
  } catch (error) {
    const status =
      error instanceof UnauthorizedError ||
      hasName(error, "UnauthorizedError")
        ? 401
        : mapDomainError(error).status
    return errorResponse(request, error, status)
  }
}

export async function PATCH(request: Request): Promise<NextResponse> {
  let authenticated = false
  let mutationSecured = false

  try {
    const user = await requireUser()
    authenticated = true
    await enforceAuthMutationSecurity(request, ACCOUNT_ROUTE)
    mutationSecured = true
    const profile = accountProfileSchema.parse(
      await parseJsonBody(request, accountProfileSchema),
    )
    return NextResponse.json(await updateProfile({ profile, userId: user.id }))
  } catch (error) {
    const unauthorized =
      error instanceof UnauthorizedError || hasName(error, "UnauthorizedError")
    const accountConflict = hasName(error, "AccountAlreadyExistsError")
    const status = unauthorized
      ? authenticated && !mutationSecured
        ? 403
        : 401
      : accountConflict
        ? 400
        : mapDomainError(error).status
    return errorResponse(request, error, status)
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  let authenticated = false
  let mutationSecured = false

  try {
    const user = await requireUser()
    authenticated = true
    await enforceAuthMutationSecurity(request, ACCOUNT_ROUTE)
    mutationSecured = true
    const input = deleteAccountSchema.parse(
      await parseJsonBody(request, deleteAccountSchema),
    )
    await deleteAccount({
      currentPassword: input.currentPassword,
      userId: user.id,
    })
    const response = NextResponse.json({ message: "Compte supprimé." })
    response.cookies.set({
      httpOnly: true,
      maxAge: 0,
      name: SESSION_COOKIE_NAME,
      path: "/",
      sameSite: "lax",
      secure: true,
      value: "",
    })
    return response
  } catch (error) {
    const unauthorized =
      error instanceof UnauthorizedError || hasName(error, "UnauthorizedError")
    const status = unauthorized
      ? authenticated && !mutationSecured
        ? 403
        : 401
      : mapDomainError(error).status
    return errorResponse(request, error, status)
  }
}
