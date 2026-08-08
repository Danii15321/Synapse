import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

type RateLimitProofInput = Readonly<{
  method: string
  nonce: string
  pathname: string
  secret: string
}>

function proofPayload({ method, nonce, pathname }: RateLimitProofInput): string {
  return `${method}\n${pathname}\n${nonce}`
}

export function createRateLimitProof(input: RateLimitProofInput): string {
  return createHmac("sha256", input.secret)
    .update(proofPayload(input))
    .digest("hex")
}

export function verifyRateLimitProof(
  input: RateLimitProofInput,
  proof: string,
): boolean {
  if (!/^[a-f0-9]{64}$/.test(proof)) {
    return false
  }

  const expected = Buffer.from(createRateLimitProof(input), "hex")
  const received = Buffer.from(proof, "hex")
  return timingSafeEqual(expected, received)
}
