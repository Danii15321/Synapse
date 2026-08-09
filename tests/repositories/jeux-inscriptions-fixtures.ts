import { randomUUID } from "node:crypto"

import { db } from "@/server/db"

const prefixes = new Set<string>()

export function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function newPrefix(label: string): string {
  const prefix = `t09-${label}-${randomUUID()}`
  prefixes.add(prefix)
  return prefix
}

export async function insertUser(
  prefix: string,
  membership: "FREE" | "PREMIUM" = "FREE",
): Promise<string> {
  const id = `${prefix}-user`
  await db.$executeRaw`
    INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "membership", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${`Membre ${prefix}`}, ${`${prefix}@example.test`},
      '$argon2id$v=19$m=65536,t=3,p=4$test$hash',
      ${membership}::"Membership", NOW(), NOW()
    )
  `
  return id
}

export async function insertJeu(
  prefix: string,
  values: Readonly<{
    capacity?: number | null
    closesAt?: Date | null
    published?: boolean
    visibility?: "FREE" | "PREMIUM"
  }> = {},
): Promise<string> {
  const id = `${prefix}-jeu`
  const capacity = values.capacity === undefined ? null : values.capacity
  const closesAt =
    values.closesAt === undefined
      ? new Date(Date.now() + 86_400_000)
      : values.closesAt
  const publishedAt = values.published === false ? null : new Date()
  const visibility = values.visibility ?? "FREE"
  await db.$executeRaw`
    INSERT INTO "Jeu" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "startsAt", "closesAt", "capacity", "location", "coverImage",
      "publishedAt", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${`${prefix}-jeu`}, ${`Concours ${prefix}`}, 'Résumé public',
      'Extrait public', ${`REGLES-SECRETES-${prefix}`},
      ${visibility}::"Visibility", NOW() + INTERVAL '7 days', ${closesAt},
      ${capacity}, 'Abidjan, Cocody', NULL, ${publishedAt}, NOW(), NOW()
    )
  `
  return id
}

export async function insertLargeJeux(
  prefix: string,
  count = 205,
): Promise<void> {
  prefixes.add(prefix)
  await db.$executeRaw`
    INSERT INTO "Jeu" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "startsAt", "closesAt", "capacity", "location", "coverImage",
      "publishedAt", "createdAt", "updatedAt"
    )
    SELECT
      ${prefix} || '-jeu-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-slug-' || LPAD(series::text, 3, '0'),
      'Jeu ' || series, 'Résumé ' || series, 'Extrait ' || series,
      'Règles ' || series, 'FREE'::"Visibility",
      NOW() + INTERVAL '30 days', NOW() + INTERVAL '29 days', NULL,
      'Abidjan', NULL, NOW() - (series || ' seconds')::interval, NOW(), NOW()
    FROM generate_series(1, ${count}) AS series
  `
}

export async function insertLargeJeuInscriptions(
  prefix: string,
  userId: string,
  count = 205,
): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "Inscription" ("id", "userId", "jeuId", "createdAt")
    SELECT
      ${prefix} || '-inscription-' || LPAD(series::text, 3, '0'),
      ${userId},
      ${prefix} || '-jeu-' || LPAD(series::text, 3, '0'),
      NOW() - (series || ' seconds')::interval
    FROM generate_series(1, ${count}) AS series
  `
}

export async function insertFormation(
  prefix: string,
  kind: "EVENEMENTIELLE" | "PERMANENTE",
  visibility: "FREE" | "PREMIUM" = "FREE",
): Promise<string> {
  const id = `${prefix}-formation`
  const startsAt =
    kind === "EVENEMENTIELLE" ? new Date(Date.now() + 7 * 86_400_000) : null
  await db.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${`${prefix}-formation`}, ${`Formation ${prefix}`},
      'Résumé public', 'Extrait public', ${`PROGRAMME-${prefix}`},
      ${visibility}::"Visibility", NOW(), 'DEBUTANT'::"Level",
      'EN_LIGNE'::"Format", 2, ${kind}::"FormationKind", ${startsAt}, NULL,
      NOW(), NOW()
    )
  `
  return id
}

export async function inscriptionCountForJeu(jeuId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "Inscription" WHERE "jeuId" = ${jeuId}
  `
  return Number(rows[0]?.count ?? 0)
}

export async function cleanupJeuxInscriptions(): Promise<void> {
  for (const prefix of prefixes) {
    const userPattern = `${prefix}%`
    const jeuPattern = `${prefix}%`
    const formationPattern = `${prefix}%`
    const tables = await db.$queryRaw<Array<{ tableName: string }>>`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('Inscription', 'FormationInscription', 'Jeu')
    `
    if (tables.some(({ tableName }) => tableName === "FormationInscription")) {
      await db.$executeRaw`
        DELETE FROM "FormationInscription"
        WHERE "userId" IN (SELECT "id" FROM "User" WHERE "id" LIKE ${userPattern})
      `
    }
    if (tables.some(({ tableName }) => tableName === "Inscription")) {
      await db.$executeRaw`
        DELETE FROM "Inscription"
        WHERE "userId" IN (SELECT "id" FROM "User" WHERE "id" LIKE ${userPattern})
      `
    }
    await db.$executeRaw`
      DELETE FROM "Formation" WHERE "id" LIKE ${formationPattern}
    `
    if (tables.some(({ tableName }) => tableName === "Jeu")) {
      await db.$executeRaw`DELETE FROM "Jeu" WHERE "id" LIKE ${jeuPattern}`
    }
    await db.$executeRaw`DELETE FROM "User" WHERE "id" LIKE ${userPattern}`
  }
  prefixes.clear()
}
