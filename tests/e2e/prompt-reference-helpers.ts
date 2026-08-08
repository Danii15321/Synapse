import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import type { Page } from "@playwright/test"

export const db = new PrismaClient()
const createdPromptPrefixes = new Set<string>()
const createdEmails = new Set<string>()

export type PromptFixture = Readonly<{
  body: string
  excerpt: string | null
  slug: string
  summary: string
  title: string
}>

export async function firstPrompt(visibility: "FREE" | "PREMIUM") {
  const rows = await db.$queryRaw<PromptFixture[]>`
    SELECT "body", "excerpt", "slug", "summary", "title"
    FROM "Prompt"
    WHERE "visibility" = ${visibility}::"Visibility"
      AND "publishedAt" IS NOT NULL
    ORDER BY "slug"
    LIMIT 1
  `
  const prompt = rows[0]
  if (!prompt) {
    throw new Error(`le seed doit fournir un prompt ${visibility} publié`)
  }
  return prompt
}

export async function registerFreeMember(page: Page): Promise<string> {
  const email = `t07-${randomUUID()}@example.test`
  createdEmails.add(email)
  await page.goto("/register")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill("MotDePasse!2026")
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await page.waitForURL(/\/compte$/u)
  return email
}

export async function insertCatalog(prefix: string): Promise<void> {
  createdPromptPrefixes.add(prefix)
  await db.$executeRaw`
    INSERT INTO "Prompt" (
      "id", "slug", "title", "summary", "excerpt", "body", "domain",
      "tags", "coverImage", "visibility", "publishedAt", "createdAt",
      "updatedAt"
    )
    SELECT
      ${prefix} || '-id-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-slug-' || LPAD(series::text, 3, '0'),
      ${prefix} || ' Prompt ' || LPAD(series::text, 3, '0'),
      CASE WHEN series = 137
        THEN ${prefix} || ' aiguille recherche unique'
        ELSE ${prefix} || ' résumé ' || series
      END,
      'Extrait public ' || series, 'Corps ' || series, 'ia',
      ARRAY[${prefix}]::text[], NULL,
      CASE WHEN series % 2 = 0
        THEN 'PREMIUM'::"Visibility"
        ELSE 'FREE'::"Visibility"
      END,
      NOW() - (series || ' seconds')::interval, NOW(), NOW()
    FROM generate_series(1, 205) AS series
  `
}

export async function cleanupReferenceFixtures(): Promise<void> {
  for (const prefix of createdPromptPrefixes) {
    await db.$executeRaw`DELETE FROM "Prompt" WHERE "id" LIKE ${`${prefix}%`}`
  }
  createdPromptPrefixes.clear()
  for (const email of createdEmails) {
    await db.user.deleteMany({ where: { email } })
  }
  createdEmails.clear()
}
