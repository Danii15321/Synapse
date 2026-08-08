import "server-only"

import { config as appConfig } from "@/server/config"
import { UnauthorizedError } from "@/server/errors"
import { resolveRateLimitIdentifier } from "@/server/rate-limit/client-identifier"
import { verifyRateLimitProof } from "@/server/rate-limit/proof"
import { enforceRateLimit } from "@/server/services/rate-limit-service"

function singleAuthority(value: string | null): string | null {
  const authority = value?.trim()
  if (
    !authority ||
    authority.includes(",") ||
    /[\s/@\\?#]/.test(authority)
  ) {
    return null
  }
  return authority
}

function requestOrigin(request: Request): string | null {
  const requestUrl = new URL(request.url)
  const trustVercel =
    appConfig.NODE_ENV === "production" && appConfig.VERCEL === "1"
  const host = singleAuthority(
    trustVercel
      ? request.headers.get("x-forwarded-host")
      : request.headers.get("host"),
  )
  const forwardedProtocol = trustVercel
    ? request.headers.get("x-forwarded-proto")?.trim()
    : null
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? `${forwardedProtocol}:`
      : requestUrl.protocol

  if (!host) {
    return trustVercel ? null : requestUrl.origin
  }

  try {
    return new URL(`${protocol}//${host}`).origin
  } catch {
    return null
  }
}

export async function enforceAuthMutationSecurity(
  request: Request,
  pathname: string,
): Promise<void> {
  const origin = request.headers.get("origin")
  if (!origin || origin !== requestOrigin(request)) {
    throw new UnauthorizedError()
  }

  const nonce = request.headers.get("x-nonce")
  const proof = request.headers.get("x-synapse-rate-limit-proof")
  if (
    nonce &&
    proof &&
    verifyRateLimitProof(
      {
        method: request.method,
        nonce,
        pathname,
        secret: appConfig.AUTH_SECRET,
      },
      proof,
    )
  ) {
    return
  }

  const identifier = resolveRateLimitIdentifier({
    headers: request.headers,
    trustedProxy:
      appConfig.NODE_ENV === "production" && appConfig.VERCEL === "1"
        ? "vercel"
        : "none",
  })
  await enforceRateLimit({
    identifier: `${identifier}:${pathname}`,
    now: new Date(),
    pathname,
  })
}
