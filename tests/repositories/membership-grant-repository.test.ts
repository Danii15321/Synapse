import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it } from "vitest"

import { db } from "@/server/db"

type MembershipRepository = Readonly<{
  grantPremium: (userId: string, source: string) => Promise<unknown>
}>

type MembershipGrantRow = Readonly<{
  createdAt: Date
  source: string
  userId: string
}>

const userIds = new Set<string>()

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

function isGrantPremium(
  value: unknown,
): value is MembershipRepository["grantPremium"] {
  return typeof value === "function"
}

async function loadMembershipRepository(): Promise<MembershipRepository> {
  const modulePath = "@/server/repositories/membership-repository"
  const module: unknown = await import(modulePath)
  if (!isRecord(module)) {
    throw new Error("membership-repository doit être un module")
  }
  const candidate = module.grantPremium
  if (!isGrantPremium(candidate)) {
    throw new Error(
      "membership-repository doit exposer la transaction grantPremium(userId, source)",
    )
  }
  return { grantPremium: candidate }
}

async function insertUser(membership: "FREE" | "PREMIUM"): Promise<string> {
  const id = `t10-membership-${randomUUID()}`
  userIds.add(id)
  await db.$executeRaw`
    INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "membership", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, 'Membre tranche 10', ${`${id}@example.test`},
      '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
      ${membership}::"Membership", NOW(), NOW()
    )
  `
  return id
}

async function grantsFor(userId: string): Promise<MembershipGrantRow[]> {
  return db.$queryRaw<MembershipGrantRow[]>`
    SELECT "userId", "source", "createdAt"
    FROM "MembershipGrant"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt", "id"
  `
}

afterEach(async () => {
  for (const userId of userIds) {
    const tables = await db.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'MembershipGrant'
    `
    if (tables.length > 0) {
      await db.$executeRaw`
        DELETE FROM "MembershipGrant" WHERE "userId" = ${userId}
      `
    }
    await db.$executeRaw`DELETE FROM "User" WHERE "id" = ${userId}`
  }
  userIds.clear()
})

describe("attribution premium sur la vraie base PostgreSQL", () => {
  it(
    scenario(
      "MembershipGrant porte les horodatages, la relation User et l'index d'audit",
      "la migration de tranche appliquée sur PostgreSQL",
      "le catalogue SQL inspecte colonnes, clés étrangères et index de MembershipGrant",
      "id, userId, source, createdAt et updatedAt sont non nuls, userId référence User.id et un index couvre userId",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{ columnName: string; isNullable: "NO" | "YES" }>
      >`
        SELECT column_name AS "columnName", is_nullable AS "isNullable"
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'MembershipGrant'
      `
      const foreignKeys = await db.$queryRaw<
        Array<{
          columnName: string
          targetColumn: string
          targetTable: string
        }>
      >`
        SELECT
          kcu.column_name AS "columnName",
          ccu.table_name AS "targetTable",
          ccu.column_name AS "targetColumn"
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.constraint_schema = kcu.constraint_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.constraint_schema = tc.constraint_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND tc.table_name = 'MembershipGrant'
      `
      const indexes = await db.$queryRaw<Array<{ indexDefinition: string }>>`
        SELECT indexdef AS "indexDefinition"
        FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'MembershipGrant'
      `

      expect(columns).toEqual(
        expect.arrayContaining(
          ["id", "userId", "source", "createdAt", "updatedAt"].map(
            (columnName) => ({ columnName, isNullable: "NO" }),
          ),
        ),
      )
      expect(foreignKeys).toContainEqual({
        columnName: "userId",
        targetColumn: "id",
        targetTable: "User",
      })
      expect(
        indexes.some(({ indexDefinition }) =>
          /\(\s*"userId"\s*\)/u.test(indexDefinition),
        ),
      ).toBe(true)
    },
  )

  it(
    scenario(
      "Une attribution effective promeut uniquement la cible et persiste qui, quand et par quelle source",
      "deux comptes FREE et aucune trace MembershipGrant pour eux",
      "le repository transactionnel cible le premier avec une source d'administration unique",
      "la cible devient PREMIUM, l'autre reste FREE et une trace porte le userId, la source et un createdAt compris dans l'opération",
    ),
    async () => {
      const targetId = await insertUser("FREE")
      const otherId = await insertUser("FREE")
      const source = `grant-premium-cli-${randomUUID()}`
      const repository = await loadMembershipRepository()
      const startedAt = new Date()

      await repository.grantPremium(targetId, source)

      const finishedAt = new Date()
      const users = await db.user.findMany({
        orderBy: { id: "asc" },
        select: { id: true, membership: true },
        where: { id: { in: [targetId, otherId] } },
      })
      const grants = await grantsFor(targetId)
      expect(users).toEqual(
        [
          { id: otherId, membership: "FREE" },
          { id: targetId, membership: "PREMIUM" },
        ].sort((left, right) => left.id.localeCompare(right.id)),
      )
      expect(grants).toHaveLength(1)
      expect(grants[0]).toMatchObject({ source, userId: targetId })
      expect(grants[0]?.createdAt.getTime()).toBeGreaterThanOrEqual(
        startedAt.getTime(),
      )
      expect(grants[0]?.createdAt.getTime()).toBeLessThanOrEqual(
        finishedAt.getTime(),
      )
      expect(await grantsFor(otherId)).toEqual([])
    },
  )

  it(
    scenario(
      "Un compte déjà PREMIUM ne produit pas une nouvelle attribution",
      "un compte PREMIUM sans trace créé comme fixture",
      "le repository transactionnel est rappelé avec une nouvelle source",
      "le membership reste PREMIUM et aucune ligne MembershipGrant n'est ajoutée",
    ),
    async () => {
      const userId = await insertUser("PREMIUM")
      const repository = await loadMembershipRepository()

      await repository.grantPremium(userId, `grant-premium-cli-${randomUUID()}`)

      const user = await db.user.findUnique({
        select: { membership: true },
        where: { id: userId },
      })
      expect(user).toEqual({ membership: "PREMIUM" })
      expect(await grantsFor(userId)).toEqual([])
    },
  )
})
