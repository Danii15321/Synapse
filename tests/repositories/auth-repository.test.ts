import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { db } from "@/server/db"

type CredentialsUser = {
  email: string
  emailVerified: Date | null
  id: string
  membership: "FREE" | "PREMIUM"
}

type CredentialsRow = CredentialsUser & {
  passwordHash: string
}

type UserRepositoryModule = {
  createCredentialsUser: (input: {
    email: string
    passwordHash: string
  }) => Promise<CredentialsUser>
  findCredentialsUserByEmail: (email: string) => Promise<CredentialsRow | null>
}

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isUserRepositoryModule(value: unknown): value is UserRepositoryModule {
  return (
    isRecord(value) &&
    typeof value.createCredentialsUser === "function" &&
    typeof value.findCredentialsUserByEmail === "function"
  )
}

async function loadRepository(): Promise<UserRepositoryModule> {
  const module: unknown = await vi.importActual(
    "@/server/repositories/user-repository",
  )
  if (!isUserRepositoryModule(module)) {
    throw new Error(
      "user-repository doit exposer createCredentialsUser et findCredentialsUserByEmail",
    )
  }
  return module
}

async function expectPostgreSql(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ version: string }>
  >`SELECT version() AS version`
  expect(rows[0]?.version).toMatch(/PostgreSQL 16/i)
}

async function deleteUser(email: string): Promise<void> {
  await db.$executeRaw`DELETE FROM "User" WHERE "email" = ${email}`
}

describe("repository d'identité sur PostgreSQL", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it(
    scenario(
      "Les quatre modèles exigés par le Prisma Adapter existent dans PostgreSQL",
      "une vraie base PostgreSQL 16 migrée pour la tranche Authentification",
      "le catalogue PostgreSQL est interrogé directement",
      "User, Account, Session et VerificationToken existent tous avec les clés d'adapter attendues",
    ),
    async () => {
      await expectPostgreSql()
      const tables = await db.$queryRaw<Array<{ tableName: string }>>`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('User', 'Account', 'Session', 'VerificationToken')
        ORDER BY table_name
      `
      const columns = await db.$queryRaw<
        Array<{ columnName: string; tableName: string }>
      >`
        SELECT table_name AS "tableName", column_name AS "columnName"
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('User', 'Account', 'Session', 'VerificationToken')
      `

      expect(tables.map((row) => row.tableName)).toEqual([
        "Account",
        "Session",
        "User",
        "VerificationToken",
      ])
      const namesFor = (tableName: string) =>
        columns
          .filter((column) => column.tableName === tableName)
          .map((column) => column.columnName)
      expect(namesFor("User")).toEqual(
        expect.arrayContaining([
          "email",
          "emailVerified",
          "id",
          "membership",
          "passwordHash",
        ]),
      )
      expect(namesFor("Account")).toEqual(
        expect.arrayContaining([
          "provider",
          "providerAccountId",
          "type",
          "userId",
        ]),
      )
      expect(namesFor("Session")).toEqual(
        expect.arrayContaining(["expires", "sessionToken", "userId"]),
      )
      expect(namesFor("VerificationToken")).toEqual(
        expect.arrayContaining(["expires", "identifier", "token"]),
      )
    },
  )

  it(
    scenario(
      "Un compte Credentials est créé FREE sans vérifier son adresse e-mail",
      "une vraie base PostgreSQL 16 sans l'adresse unique du scénario",
      "le repository crée l'utilisateur avec un hash argon2id",
      "la ligne persistée a membership FREE et emailVerified null, tandis que le DTO retourné ne contient jamais passwordHash",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const email = `auth-${randomUUID()}@example.test`
      await deleteUser(email)

      const created = await repository.createCredentialsUser({
        email,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$hash",
      })
      const rows = await db.$queryRaw<
        Array<{
          emailVerified: Date | null
          membership: string
          passwordHash: string
        }>
      >`
        SELECT "emailVerified", "membership"::text, "passwordHash"
        FROM "User"
        WHERE "email" = ${email}
      `

      expect(Object.keys(created).sort()).toEqual([
        "email",
        "emailVerified",
        "id",
        "membership",
      ])
      expect(created).toMatchObject({
        email,
        emailVerified: null,
        membership: "FREE",
      })
      expect(rows).toEqual([
        {
          emailVerified: null,
          membership: "FREE",
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$hash",
        },
      ])

      await deleteUser(email)
    },
  )

  it(
    scenario(
      "La recherche Credentials ne charge que les champs nécessaires à l'authentification",
      "une vraie base PostgreSQL 16 contenant un utilisateur Credentials unique",
      "le repository recherche l'adresse exacte",
      "il retourne seulement id, email, emailVerified, membership et passwordHash, sans session, compte ni timestamps",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const email = `lookup-${randomUUID()}@example.test`
      await deleteUser(email)
      await repository.createCredentialsUser({
        email,
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$test$lookup",
      })

      const row = await repository.findCredentialsUserByEmail(email)

      expect(row).not.toBeNull()
      expect(Object.keys(row ?? {}).sort()).toEqual([
        "email",
        "emailVerified",
        "id",
        "membership",
        "passwordHash",
      ])
      expect(row?.email).toBe(email)

      await deleteUser(email)
    },
  )
})
