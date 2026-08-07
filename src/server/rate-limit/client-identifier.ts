import "server-only"

import { isIP } from "node:net"

const FAIL_CLOSED_IDENTIFIER = "ip:untrusted-client"

type ResolveRateLimitIdentifierInput = Readonly<{
  headers: Headers
  trustedProxy: "none" | "vercel"
}>

export function resolveRateLimitIdentifier({
  headers,
  trustedProxy,
}: ResolveRateLimitIdentifierInput): string {
  if (trustedProxy !== "vercel") {
    return FAIL_CLOSED_IDENTIFIER
  }

  const forwardedFor = headers.get("x-forwarded-for")?.trim()
  if (!forwardedFor || forwardedFor.includes(",") || isIP(forwardedFor) === 0) {
    return FAIL_CLOSED_IDENTIFIER
  }

  return `ip:${forwardedFor}`
}
