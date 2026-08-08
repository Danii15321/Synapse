import "server-only"

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
export const SESSION_COOKIE_NAME = "__Secure-authjs.session-token"

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: "/",
  sameSite: "lax",
  secure: true,
} as const
