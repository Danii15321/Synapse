import "server-only"

import type { LoginInput } from "@/lib/validators/auth"
import { verifyPassword } from "@/server/auth/password"
import { findCredentialsUserByEmail } from "@/server/repositories/user-repository"

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c3luYXBzLWR1bW15LXNhbHQ$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"

export async function authorizeCredentials({ email, password }: LoginInput) {
  const user = await findCredentialsUserByEmail(email)
  const valid = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    password,
  )

  if (!user || !valid) {
    return null
  }

  return {
    email: user.email,
    id: user.id,
    membership: user.membership,
  }
}
