import "server-only"

import type { RegisterInput, SessionUser } from "@/lib/validators/auth"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { InvalidCurrentPasswordError } from "@/server/errors"
import {
  createCredentialsUser,
  findCredentialsUserById,
  replacePasswordAndSessions,
} from "@/server/repositories/user-repository"

type ChangePasswordServiceInput = Readonly<{
  currentPassword: string
  currentSessionToken: string
  newPassword: string
  userId: string
}>

/**
 * Spécification : crée un compte FREE à partir d'un hash argon2id et ne
 * retourne jamais de secret. Cette tranche ne décide encore aucun accès
 * premium : le membership est une donnée d'identité destinée à la tranche 05.
 */
export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password)
  return createCredentialsUser({ email: input.email, passwordHash })
}

export function getAccount(user: SessionUser): SessionUser {
  return user
}

/**
 * Spécification : vérifie l'ancien secret avant toute écriture, puis remplace
 * le hash et toutes les sessions dans une transaction. Aucune règle premium
 * ne s'applique à cette opération d'identité.
 */
export async function changePassword(input: ChangePasswordServiceInput) {
  const user = await findCredentialsUserById(input.userId)
  if (!user || !(await verifyPassword(user.passwordHash, input.currentPassword))) {
    throw new InvalidCurrentPasswordError()
  }

  const passwordHash = await hashPassword(input.newPassword)
  return replacePasswordAndSessions({
    currentSessionToken: input.currentSessionToken,
    passwordHash,
    userId: input.userId,
  })
}
