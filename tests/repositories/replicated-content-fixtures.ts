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

export function rowsOf(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("le repository doit retourner un tableau de rows")
  }
  return value
}

export function newPrefix(label: string): string {
  const prefix = `t08-${label}-${randomUUID()}`
  prefixes.add(prefix)
  return prefix
}

export async function insertFormation(
  prefix: string,
  values: Readonly<{
    body?: string
    kind?: "PERMANENTE" | "EVENEMENTIELLE"
    level?: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"
    published?: boolean
    startsAt?: Date | null
    visibility?: "FREE" | "PREMIUM"
  }> = {},
): Promise<void> {
  const kind = values.kind ?? "PERMANENTE"
  const level = values.level ?? "DEBUTANT"
  const publishedAt = values.published === false ? null : new Date()
  const startsAt = values.startsAt ?? null
  const visibility = values.visibility ?? "FREE"
  await db.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES (
      ${`${prefix}-id`}, ${`${prefix}-slug`}, ${`Formation ${prefix}`},
      'Résumé public', 'Extrait public', ${values.body ?? `CORPS-${prefix}`},
      ${visibility}::"Visibility", ${publishedAt}, ${level}::"Level",
      'EN_LIGNE'::"Format", 3, ${kind}::"FormationKind", ${startsAt}, NULL,
      NOW(), NOW()
    )
  `
}

export async function insertOpportunite(
  prefix: string,
  values: Readonly<{
    body?: string
    deadline?: Date | null
    externalUrl?: string | null
    published?: boolean
    type?: "STAGE" | "EMPLOI" | "APPEL_OFFRE" | "FINANCEMENT" | "COLLABORATION"
    visibility?: "FREE" | "PREMIUM"
  }> = {},
): Promise<void> {
  const deadline = values.deadline === undefined ? null : values.deadline
  const publishedAt = values.published === false ? null : new Date()
  const type = values.type ?? "STAGE"
  const typeLiteral = {
    APPEL_OFFRE: "APPEL_OFFRE",
    COLLABORATION: "COLLABORATION",
    EMPLOI: "EMPLOI",
    FINANCEMENT: "FINANCEMENT",
    STAGE: "STAGE",
  }[type]
  const visibility = values.visibility ?? "FREE"
  await db.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES (
      ${`${prefix}-id`}, ${`${prefix}-slug`}, ${`Opportunité ${prefix}`},
      'Résumé public', 'Extrait public', ${values.body ?? `CORPS-${prefix}`},
      ${visibility}::"Visibility", ${publishedAt},
      ${typeLiteral}::"OpportuniteType", 'Synapse Test',
      ${deadline}, ${values.externalUrl ?? `https://example.test/${prefix}`},
      NULL, NOW(), NOW()
    )
  `
}

export async function insertLargeFormations(
  prefix: string,
  count = 205,
): Promise<void> {
  prefixes.add(prefix)
  await db.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    )
    SELECT
      ${prefix} || '-id-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-slug-' || LPAD(series::text, 3, '0'),
      'Formation ' || series, 'Résumé ' || series, 'Extrait ' || series,
      'Corps ' || series, 'FREE'::"Visibility",
      NOW() - (series || ' seconds')::interval, 'DEBUTANT'::"Level",
      'EN_LIGNE'::"Format", 2, 'PERMANENTE'::"FormationKind", NULL, NULL,
      NOW(), NOW()
    FROM generate_series(1, ${count}) AS series
  `
}

export async function insertLargeOpportunites(
  prefix: string,
  count = 205,
): Promise<void> {
  prefixes.add(prefix)
  await db.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    )
    SELECT
      ${prefix} || '-id-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-slug-' || LPAD(series::text, 3, '0'),
      'Opportunité ' || series, 'Résumé ' || series, 'Extrait ' || series,
      'Corps ' || series, 'FREE'::"Visibility",
      NOW() - (series || ' seconds')::interval, 'STAGE'::"OpportuniteType",
      'Synapse', NOW() + INTERVAL '30 days', NULL, NULL, NOW(), NOW()
    FROM generate_series(1, ${count}) AS series
  `
}

export async function cleanupReplicatedContent(): Promise<void> {
  for (const prefix of prefixes) {
    await db.$executeRaw`DELETE FROM "Formation" WHERE "id" LIKE ${`${prefix}%`}`
    await db.$executeRaw`DELETE FROM "Opportunite" WHERE "id" LIKE ${`${prefix}%`}`
  }
  prefixes.clear()
}
