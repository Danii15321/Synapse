import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import type { Page } from "@playwright/test"

import { completeRegistration } from "./auth-profile-helpers"

export const replicatedDb = new PrismaClient()
const prefixes = new Set<string>()
const emails = new Set<string>()

export type ReplicatedFixtures = Readonly<{
  expiredOpportunity: Readonly<{ slug: string; title: string }>
  futureFormation: Readonly<{
    body: string
    slug: string
    title: string
  }>
  permanentFormation: Readonly<{
    body: string
    slug: string
    title: string
  }>
  premiumOpportunity: Readonly<{
    body: string
    externalUrl: string
    slug: string
    title: string
  }>
}>

export type FilterUiCatalogs = Readonly<{
  employmentOpportunityTitle: string
  financingOpportunityTitle: string
  formationTitle: string
  prefix: string
}>

export async function insertFilterUiCatalogs(): Promise<FilterUiCatalogs> {
  const prefix = `filters-e2e-${randomUUID()}`
  prefixes.add(prefix)
  await replicatedDb.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    )
    SELECT
      ${prefix} || '-formation-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-formation-' || LPAD(series::text, 3, '0'),
      ${prefix} || ' Formation ' || LPAD(series::text, 3, '0'),
      'Résumé formation ' || series, 'Extrait formation ' || series,
      'Programme formation ' || series, 'FREE'::"Visibility",
      NOW() + INTERVAL '1 day' - (series || ' seconds')::interval,
      'DEBUTANT'::"Level", 'EN_LIGNE'::"Format", 2,
      'PERMANENTE'::"FormationKind", NULL, NULL, NOW(), NOW()
    FROM generate_series(1, 26) AS series
  `
  await replicatedDb.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    )
    SELECT
      ${prefix} || '-financement-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-financement-' || LPAD(series::text, 3, '0'),
      ${prefix} || ' Financement ' || LPAD(series::text, 3, '0'),
      'Résumé financement ' || series, 'Extrait financement ' || series,
      'Corps financement ' || series, 'FREE'::"Visibility",
      NOW() + INTERVAL '1 day' - (series || ' seconds')::interval,
      'FINANCEMENT'::"OpportuniteType", 'Synapse',
      NOW() + INTERVAL '30 days', NULL, NULL, NOW(), NOW()
    FROM generate_series(1, 26) AS series
  `
  const employmentOpportunityTitle = `${prefix} Emploi témoin`
  await replicatedDb.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES (
      ${`${prefix}-emploi-temoin`}, ${`${prefix}-emploi-temoin`},
      ${employmentOpportunityTitle}, 'Résumé emploi', 'Extrait emploi',
      'Corps emploi', 'FREE'::"Visibility", NOW() + INTERVAL '2 days',
      'EMPLOI'::"OpportuniteType", 'Synapse', NOW() + INTERVAL '30 days',
      NULL, NULL, NOW(), NOW()
    )
  `
  return {
    employmentOpportunityTitle,
    financingOpportunityTitle: `${prefix} Financement 001`,
    formationTitle: `${prefix} Formation 001`,
    prefix,
  }
}

export async function insertReplicatedFixtures(): Promise<ReplicatedFixtures> {
  const prefix = `t08-e2e-${randomUUID()}`
  prefixes.add(prefix)
  const permanentFormation = {
    body: `PROGRAMME-PERMANENT-${prefix}`,
    slug: `${prefix}-permanente`,
    title: `${prefix} Formation permanente`,
  }
  const futureFormation = {
    body: `PROGRAMME-PREMIUM-${prefix}`,
    slug: `${prefix}-evenement-futur`,
    title: `${prefix} Atelier futur`,
  }
  const expiredFormation = {
    slug: `${prefix}-evenement-passe`,
    title: `${prefix} Atelier passé`,
  }
  await replicatedDb.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES
    (
      ${`${prefix}-formation-permanente`}, ${permanentFormation.slug},
      ${permanentFormation.title}, 'Consultable à tout moment', 'Extrait libre',
      ${permanentFormation.body}, 'FREE'::"Visibility", NOW(),
      'DEBUTANT'::"Level", 'EN_LIGNE'::"Format", 3,
      'PERMANENTE'::"FormationKind", NULL, NULL, NOW(), NOW()
    ),
    (
      ${`${prefix}-formation-future`}, ${futureFormation.slug},
      ${futureFormation.title}, 'Session future', 'Extrait premium formation',
      ${futureFormation.body}, 'PREMIUM'::"Visibility", NOW(),
      'AVANCE'::"Level", 'HYBRIDE'::"Format", 5,
      'EVENEMENTIELLE'::"FormationKind", NOW() + INTERVAL '30 days', NULL,
      NOW(), NOW()
    ),
    (
      ${`${prefix}-formation-past`}, ${expiredFormation.slug},
      ${expiredFormation.title}, 'Session passée', 'Extrait passé',
      'PROGRAMME PASSE', 'FREE'::"Visibility", NOW(),
      'INTERMEDIAIRE'::"Level", 'PRESENTIEL'::"Format", 2,
      'EVENEMENTIELLE'::"FormationKind", NOW() - INTERVAL '1 day', NULL,
      NOW(), NOW()
    )
  `

  const premiumOpportunity = {
    body: `BODY-OPPORTUNITE-${prefix}`,
    externalUrl: `https://candidature.example.test/${prefix}`,
    slug: `${prefix}-opportunite-future`,
    title: `${prefix} Financement futur`,
  }
  const expiredOpportunity = {
    slug: `${prefix}-opportunite-expiree`,
    title: `${prefix} Stage expiré`,
  }
  await replicatedDb.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES
    (
      ${`${prefix}-opportunite-future`}, ${premiumOpportunity.slug},
      ${premiumOpportunity.title}, 'Résumé financement', 'Extrait opportunité',
      ${premiumOpportunity.body}, 'PREMIUM'::"Visibility", NOW(),
      'FINANCEMENT'::"OpportuniteType", 'Synapse', NOW() + INTERVAL '30 days',
      ${premiumOpportunity.externalUrl}, NULL, NOW(), NOW()
    ),
    (
      ${`${prefix}-opportunite-expiree`}, ${expiredOpportunity.slug},
      ${expiredOpportunity.title}, 'Résumé expiré', 'Extrait expiré',
      'BODY EXPIRE', 'FREE'::"Visibility", NOW(),
      'STAGE'::"OpportuniteType", 'Synapse', NOW() - INTERVAL '1 day',
      'https://example.test/expire', NULL, NOW(), NOW()
    )
  `
  return {
    expiredOpportunity,
    futureFormation,
    permanentFormation,
    premiumOpportunity,
  }
}

export async function registerReplicatedMember(page: Page): Promise<string> {
  const email = `t08-${randomUUID()}@example.test`
  emails.add(email)
  await page.goto("/register")
  await completeRegistration(page, {
    email,
    password: "MotDePasse!2026",
  })
  await page.waitForURL(/\/compte$/u)
  return email
}

export async function cleanupReplicatedFixtures(): Promise<void> {
  for (const prefix of prefixes) {
    await replicatedDb.$executeRaw`DELETE FROM "Formation" WHERE "id" LIKE ${`${prefix}%`}`
    await replicatedDb.$executeRaw`DELETE FROM "Opportunite" WHERE "id" LIKE ${`${prefix}%`}`
  }
  prefixes.clear()
  for (const email of emails) {
    await replicatedDb.user.deleteMany({ where: { email } })
  }
  emails.clear()
}
