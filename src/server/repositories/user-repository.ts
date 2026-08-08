import "server-only"

import { randomUUID } from "node:crypto"

import { db } from "@/server/db"
import {
  AccountAlreadyExistsError,
  UnauthorizedError,
} from "@/server/errors"

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000

type CreateCredentialsUserInput = Readonly<{
  email: string
  passwordHash: string
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

export async function createCredentialsUser({
  email,
  passwordHash,
}: CreateCredentialsUserInput) {
  try {
    return await db.user.create({
      data: { email, passwordHash },
      select: {
        email: true,
        emailVerified: true,
        id: true,
        membership: true,
      },
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AccountAlreadyExistsError()
    }
    throw error
  }
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
