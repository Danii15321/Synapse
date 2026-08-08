import "server-only"

import { randomUUID } from "node:crypto"

import type { LoginInput } from "@/lib/validators/auth"
import { authorizeCredentials } from "@/server/auth/credentials"
import { SESSION_MAX_AGE_SECONDS } from "@/server/auth/session-cookie"
import { createSession } from "@/server/repositories/user-repository"

export async function createCredentialSession(input: LoginInput) {
  const user = await authorizeCredentials(input)
  if (!user) {
    return null
  }

  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1_000)
  const sessionToken = randomUUID()
  await createSession({ expires, sessionToken, userId: user.id })

  return { expires, sessionToken }
}
