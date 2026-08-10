import { randomUUID } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"

import { config as appConfig } from "@/server/config"
import { SESSION_COOKIE_NAME } from "@/server/auth/session-cookie"
import { mapDomainError, RateLimitedError } from "@/server/errors"
import { writeLog } from "@/server/logger"
import { resolveRateLimitIdentifier } from "@/server/rate-limit/client-identifier"
import { createRateLimitProof } from "@/server/rate-limit/proof"
import { enforceRateLimit } from "@/server/services/rate-limit-service"

const GENERIC_ERROR_MESSAGE = "La requête n'a pas pu être traitée."
const SECURITY_HEADERS = {
  "Permissions-Policy": "geolocation=(), camera=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const

function createContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src https://wa.me",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")
}

function applySecurityHeaders(response: NextResponse, csp: string): void {
  response.headers.set("Content-Security-Policy", csp)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }
}

function isMemberPath(pathname: string): boolean {
  return pathname === "/compte" || pathname.startsWith("/compte/")
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now()
  const nonce = Buffer.from(randomUUID()).toString("base64")
  const csp = createContentSecurityPolicy(nonce)
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Content-Security-Policy", csp)
  requestHeaders.set("x-nonce", nonce)

  try {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const identifier = resolveRateLimitIdentifier({
        headers: request.headers,
        trustedProxy:
          appConfig.NODE_ENV === "production" && appConfig.VERCEL === "1"
            ? "vercel"
            : "none",
      })
      await enforceRateLimit({
        identifier,
        now: new Date(),
        pathname: request.nextUrl.pathname,
      })
      requestHeaders.set(
        "x-synapse-rate-limit-proof",
        createRateLimitProof({
          method: request.method,
          nonce,
          pathname: request.nextUrl.pathname,
          secret: appConfig.AUTH_SECRET,
        }),
      )
    }

    if (
      isMemberPath(request.nextUrl.pathname) &&
      !request.cookies.has(SESSION_COOKIE_NAME)
    ) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      )
      const response = NextResponse.redirect(loginUrl)
      applySecurityHeaders(response, csp)
      return response
    }

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    })
    applySecurityHeaders(response, csp)
    return response
  } catch (error) {
    const errorId = randomUUID()
    const { status } = mapDomainError(error)

    writeLog({
      durationMs: Date.now() - startedAt,
      error:
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : { message: String(error) },
      errorId,
      method: request.method,
      route: request.nextUrl.pathname,
      status,
    })

    const response = NextResponse.json(
      { errorId, message: GENERIC_ERROR_MESSAGE },
      { status },
    )
    if (error instanceof RateLimitedError) {
      response.headers.set("Retry-After", String(error.retryAfterSeconds))
    }
    applySecurityHeaders(response, csp)
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
  runtime: "nodejs",
}
