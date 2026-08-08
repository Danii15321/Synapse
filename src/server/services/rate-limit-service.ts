import "server-only"

import { RateLimitedError } from "@/server/errors"
import {
  purgeExpiredRateLimits,
  recordRateLimitHit,
} from "@/server/repositories/rate-limit-repository"

const WINDOW_MS = 60_000
const GENERAL_LIMIT = 60
const SENSITIVE_LIMIT = 10

type EnforceRateLimitInput = Readonly<{
  identifier: string
  now: Date
  pathname: string
}>

function isSensitiveRoute(pathname: string): boolean {
  return (
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    /\/inscriptions(?:\/|$)/.test(pathname)
  )
}

function sensitiveBucket(pathname: string): string {
  if (pathname === "/api/auth/register") {
    return "auth-register"
  }
  if (pathname.startsWith("/api/auth/callback/")) {
    return "auth-callback"
  }
  if (
    pathname === "/api/auth/signout" ||
    pathname === "/api/auth/logout"
  ) {
    return "auth-signout"
  }
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return "auth-other"
  }
  return "inscriptions"
}

/**
 * Spécification : compte les appels par IP dans une fenêtre d'une minute,
 * avec un quota général de 60 et un quota sensible de 10. Une fenêtre
 * expirée est purgée avant le hit courant. Ce mécanisme ne traite aucun
 * contenu premium et ne porte donc aucune règle d'entitlement.
 */
export async function enforceRateLimit({
  identifier,
  now,
  pathname,
}: EnforceRateLimitInput): Promise<void> {
  const sensitive = isSensitiveRoute(pathname)
  const limit = sensitive ? SENSITIVE_LIMIT : GENERAL_LIMIT
  const bucket = sensitive ? `sensitive:${sensitiveBucket(pathname)}` : "general"

  await purgeExpiredRateLimits(now)
  const hit = await recordRateLimitHit({
    identifier: `${bucket}:${identifier}`,
    now,
    windowMs: WINDOW_MS,
  })

  if (hit.count > limit) {
    throw new RateLimitedError(hit.retryAfterSeconds)
  }
}
