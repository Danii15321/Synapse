import "server-only"

import { randomUUID } from "node:crypto"

import type { AccountProfileInput } from "@/lib/validators/auth"
import { db } from "@/server/db"
import {
  AccountAlreadyExistsError,
  UnauthorizedError,
} from "@/server/errors"

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000

type LegacyCredentialsUserInput = Readonly<{
  email: string
  passwordHash: string
}>

type ProfileCredentialsUserInput = Readonly<{
  city: AccountProfileInput["city"]
  country: AccountProfileInput["country"]
  email: AccountProfileInput["email"]
  firstName: AccountProfileInput["firstName"]
  lastName: AccountProfileInput["lastName"]
  name: string
  passwordHash: string
  phone: AccountProfileInput["phone"]
  professionalLevel: AccountProfileInput["professionalLevel"]
}>

type UpdateUserProfileInput = AccountProfileInput &
  Readonly<{
    name: string
    userId: string
  }>

type ReplacePasswordAndSessionsInput = Readonly<{
  currentSessionToken: string
  passwordHash: string
  userId: string
}>

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  )
}

export function createCredentialsUser(
  input: LegacyCredentialsUserInput,
): Promise<{
  email: string
  emailVerified: Date | null
  id: string
  membership: "FREE" | "PREMIUM"
}>
export function createCredentialsUser(
  input: ProfileCredentialsUserInput,
): Promise<{
  city: string
  country: string
  email: string
  firstName: string
  id: string
  lastName: string
  membership: "FREE" | "PREMIUM"
  phone: string
  professionalLevel: AccountProfileInput["professionalLevel"]
}>
export async function createCredentialsUser(
  input: LegacyCredentialsUserInput | ProfileCredentialsUserInput,
) {
  try {
    if (!("firstName" in input)) {
      return await db.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
        },
        select: {
          email: true,
          emailVerified: true,
          id: true,
          membership: true,
        },
      })
    }

    return await db.user.create({
      data: {
        city: input.city,
        country: input.country,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        name: input.name,
        passwordHash: input.passwordHash,
        phone: input.phone,
        professionalLevel: input.professionalLevel,
      },
      select: {
        city: true,
        country: true,
        email: true,
        firstName: true,
        id: true,
        lastName: true,
        membership: true,
        phone: true,
        professionalLevel: true,
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AccountAlreadyExistsError()
    }
    throw error
  }
}

export function findUserProfileById(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      city: true,
      country: true,
      email: true,
      firstName: true,
      id: true,
      lastName: true,
      membership: true,
      phone: true,
      professionalLevel: true,
    },
  })
}

export async function updateUserProfile({
  city,
  country,
  email,
  firstName,
  lastName,
  name,
  phone,
  professionalLevel,
  userId,
}: UpdateUserProfileInput) {
  try {
    return await db.user.update({
      where: { id: userId },
      data: {
        city,
        country,
        email,
        firstName,
        lastName,
        name,
        phone,
        professionalLevel,
      },
      select: {
        city: true,
        country: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        professionalLevel: true,
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AccountAlreadyExistsError()
    }
    throw error
  }
}

export function deleteUserById(userId: string) {
  return db.user.delete({
    where: { id: userId },
    select: { id: true },
  })
}

export function findCredentialsUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: {
      email: true,
      emailVerified: true,
      id: true,
      membership: true,
      passwordHash: true,
    },
  })
}

export function findUserIdByEmail(email: string) {
  return db.user.findUnique({
    where: { email },
    select: { id: true },
  })
}

export function findCredentialsUserById(id: string) {
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      passwordHash: true,
    },
  })
}

export async function replacePasswordAndSessions({
  currentSessionToken,
  passwordHash,
  userId,
}: ReplacePasswordAndSessionsInput): Promise<{ sessionToken: string }> {
  return db.$transaction(async (transaction) => {
    const currentSession = await transaction.session.findUnique({
      where: { sessionToken: currentSessionToken },
      select: { userId: true },
    })

    if (currentSession?.userId !== userId) {
      throw new UnauthorizedError()
    }

    await transaction.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true },
    })
    await transaction.session.deleteMany({ where: { userId } })

    const sessionToken = randomUUID()
    await transaction.session.create({
      data: {
        expires: new Date(Date.now() + SESSION_MAX_AGE_MS),
        sessionToken,
        userId,
      },
      select: { sessionToken: true },
    })

    return { sessionToken }
  })
}

export function createSession(input: {
  expires: Date
  sessionToken: string
  userId: string
}) {
  return db.session.create({
    data: input,
    select: { expires: true, sessionToken: true, userId: true },
  })
}
