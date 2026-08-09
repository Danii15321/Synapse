import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import type { Page } from "@playwright/test"

export const participationDb = new PrismaClient()
const prefixes = new Set<string>()
const emails = new Set<string>()

export type ParticipationFixtures = Readonly<{
  closedJeu: Readonly<{ slug: string; title: string }>
  eventFormation: Readonly<{ slug: string; title: string }>
  fullJeu: Readonly<{ slug: string; title: string }>
  openJeu: Readonly<{
    body: string
    location: string
    slug: string
    title: string
  }>
  permanentFormation: Readonly<{ slug: string; title: string }>
  premiumJeu: Readonly<{ body: string; slug: string; title: string }>
}>

export async function insertParticipationFixtures(): Promise<ParticipationFixtures> {
  const prefix = `t09-e2e-${randomUUID()}`
  prefixes.add(prefix)
  const openJeu = {
    body: `REGLES-OPEN-${prefix}`,
    location: "Abidjan, Cocody",
    slug: `${prefix}-open`,
    title: `${prefix} Challenge ouvert`,
  }
  const closedJeu = {
    slug: `${prefix}-closed`,
    title: `${prefix} Challenge clos`,
  }
  const fullJeu = {
    slug: `${prefix}-full`,
    title: `${prefix} Challenge complet`,
  }
  const premiumJeu = {
    body: `REGLES-PREMIUM-${prefix}`,
    slug: `${prefix}-premium`,
    title: `${prefix} Challenge premium`,
  }
  await participationDb.$executeRaw`
    INSERT INTO "Jeu" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "startsAt", "closesAt", "capacity", "location", "coverImage",
      "publishedAt", "createdAt", "updatedAt"
    ) VALUES
    (
      ${`${prefix}-open`}, ${openJeu.slug}, ${openJeu.title}, 'Résumé ouvert',
      'Extrait ouvert', ${openJeu.body}, 'FREE'::"Visibility",
      NOW() + INTERVAL '30 days', NOW() + INTERVAL '29 days', 20,
      ${openJeu.location}, NULL, NOW(), NOW(), NOW()
    ),
    (
      ${`${prefix}-closed`}, ${closedJeu.slug}, ${closedJeu.title}, 'Résumé clos',
      'Extrait clos', 'REGLES CLOSES', 'FREE'::"Visibility",
      NOW() + INTERVAL '30 days', NOW() - INTERVAL '1 day', 20,
      'Abidjan', NULL, NOW(), NOW(), NOW()
    ),
    (
      ${`${prefix}-full`}, ${fullJeu.slug}, ${fullJeu.title}, 'Résumé complet',
      'Extrait complet', 'REGLES COMPLETES', 'FREE'::"Visibility",
      NOW() + INTERVAL '30 days', NOW() + INTERVAL '29 days', 0,
      'Abidjan', NULL, NOW(), NOW(), NOW()
    ),
    (
      ${`${prefix}-premium`}, ${premiumJeu.slug}, ${premiumJeu.title},
      'Résumé premium', 'Extrait premium', ${premiumJeu.body},
      'PREMIUM'::"Visibility", NOW() + INTERVAL '30 days',
      NOW() + INTERVAL '29 days', 20, 'Yamoussoukro', NULL,
      NOW(), NOW(), NOW()
    )
  `

  const eventFormation = {
    slug: `${prefix}-formation-event`,
    title: `${prefix} Atelier événementiel`,
  }
  const permanentFormation = {
    slug: `${prefix}-formation-permanent`,
    title: `${prefix} Formation permanente`,
  }
  await participationDb.$executeRaw`
    INSERT INTO "Formation" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "level", "format", "durationH", "kind", "startsAt",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES
    (
      ${`${prefix}-formation-event`}, ${eventFormation.slug},
      ${eventFormation.title}, 'Résumé événement', 'Extrait événement',
      'PROGRAMME EVENEMENT', 'FREE'::"Visibility", NOW(),
      'DEBUTANT'::"Level", 'EN_LIGNE'::"Format", 2,
      'EVENEMENTIELLE'::"FormationKind", NOW() + INTERVAL '20 days', NULL,
      NOW(), NOW()
    ),
    (
      ${`${prefix}-formation-permanent`}, ${permanentFormation.slug},
      ${permanentFormation.title}, 'Résumé permanent', 'Extrait permanent',
      'PROGRAMME PERMANENT', 'FREE'::"Visibility", NOW(),
      'DEBUTANT'::"Level", 'EN_LIGNE'::"Format", 2,
      'PERMANENTE'::"FormationKind", NULL, NULL, NOW(), NOW()
    )
  `
  return {
    closedJeu,
    eventFormation,
    fullJeu,
    openJeu,
    permanentFormation,
    premiumJeu,
  }
}

export async function registerParticipationMember(page: Page): Promise<string> {
  const email = `t09-${randomUUID()}@example.test`
  emails.add(email)
  await page.goto("/register")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill("MotDePasse!2026")
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await page.waitForURL(/\/compte$/u)
  return email
}

export async function countJeuParticipations(slug: string): Promise<number> {
  const rows = await participationDb.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM "Inscription" i
    JOIN "Jeu" j ON j."id" = i."jeuId"
    WHERE j."slug" = ${slug}
  `
  return Number(rows[0]?.count ?? 0)
}

export async function clearParticipationRateLimits(): Promise<void> {
  await participationDb.$executeRaw`DELETE FROM "RateLimit"`
}

export async function cleanupParticipationFixtures(): Promise<void> {
  for (const prefix of prefixes) {
    const pattern = `${prefix}%`
    const tables = await participationDb.$queryRaw<Array<{ name: string }>>`
      SELECT table_name AS name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('Inscription', 'FormationInscription', 'Jeu')
    `
    if (tables.some(({ name }) => name === "FormationInscription")) {
      await participationDb.$executeRaw`
        DELETE FROM "FormationInscription"
        WHERE "formationId" IN (
          SELECT "id" FROM "Formation" WHERE "id" LIKE ${pattern}
        )
      `
    }
    if (tables.some(({ name }) => name === "Inscription")) {
      await participationDb.$executeRaw`
        DELETE FROM "Inscription"
        WHERE "jeuId" IN (SELECT "id" FROM "Jeu" WHERE "id" LIKE ${pattern})
           OR "userId" IN (SELECT "id" FROM "User" WHERE "email" LIKE 't09-%')
      `
    }
    await participationDb.$executeRaw`
      DELETE FROM "Formation" WHERE "id" LIKE ${pattern}
    `
    if (tables.some(({ name }) => name === "Jeu")) {
      await participationDb.$executeRaw`
        DELETE FROM "Jeu" WHERE "id" LIKE ${pattern}
      `
    }
  }
  prefixes.clear()
  for (const email of emails) {
    await participationDb.user.deleteMany({ where: { email } })
  }
  emails.clear()
}
