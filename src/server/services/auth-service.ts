import "server-only"

import type {
  AccountProfileInput,
  RegisterInput,
} from "@/lib/validators/auth"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import {
  InvalidCurrentPasswordError,
  UnauthorizedError,
} from "@/server/errors"
import {
  createCredentialsUser,
  deleteUserById,
  findCredentialsUserById,
  findUserProfileById,
  replacePasswordAndSessions,
  updateUserProfile,
} from "@/server/repositories/user-repository"

type ChangePasswordServiceInput = Readonly<{
  currentPassword: string
  currentSessionToken: string
  newPassword: string
  userId: string
}>

type UpdateProfileServiceInput = Readonly<{
  profile: AccountProfileInput
  userId: string
}>

type DeleteAccountServiceInput = Readonly<{
  currentPassword: string
  userId: string
}>

function profileName(profile: AccountProfileInput): string {
  return `${profile.firstName} ${profile.lastName}`
}

/**
 * Spécification : crée un compte FREE à partir d'un hash argon2id et ne
 * retourne jamais de secret. Cette tranche ne décide encore aucun accès
 * premium : le membership est une donnée d'identité destinée à la tranche 05.
 */
export async function registerUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password)
  const profile = {
    city: input.city,
    country: input.country,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    professionalLevel: input.professionalLevel,
  }
  return createCredentialsUser({
    ...profile,
    name: profileName(profile),
    passwordHash,
  })
}

export async function getAccount(userId: string) {
  const account = await findUserProfileById(userId)
  if (!account) throw new UnauthorizedError()
  return account
}

export function updateProfile({
  profile,
  userId,
}: UpdateProfileServiceInput) {
  return updateUserProfile({
    ...profile,
    name: profileName(profile),
    userId,
  })
}

export async function deleteAccount({
  currentPassword,
  userId,
}: DeleteAccountServiceInput): Promise<void> {
  const user = await findCredentialsUserById(userId)
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new InvalidCurrentPasswordError()
  }
  await deleteUserById(userId)
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
