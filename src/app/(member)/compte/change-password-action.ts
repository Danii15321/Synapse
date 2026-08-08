"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { changePasswordSchema } from "@/lib/validators/auth"
import {
  changePassword,
  config as appConfig,
  enforceRateLimit,
  requireUser,
  resolveRateLimitIdentifier,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  UnauthorizedError,
} from "@/server"

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser()
  const input = changePasswordSchema.parse(Object.fromEntries(formData))
  const requestHeaders = await headers()
  const identifier = resolveRateLimitIdentifier({
    headers: requestHeaders,
    trustedProxy:
      appConfig.NODE_ENV === "production" && appConfig.VERCEL === "1"
        ? "vercel"
        : "none",
  })
  await enforceRateLimit({
    identifier: `${identifier}:/api/auth/change-password`,
    now: new Date(),
    pathname: "/api/auth/change-password",
  })

  const cookieStore = await cookies()
  const currentSessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!currentSessionToken) {
    throw new UnauthorizedError()
  }

  const result = await changePassword({
    currentPassword: input.currentPassword,
    currentSessionToken,
    newPassword: input.newPassword,
    userId: user.id,
  })
  cookieStore.set({
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    name: SESSION_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: true,
    value: result.sessionToken,
  })

  redirect("/compte?passwordChanged=rotating")
}
