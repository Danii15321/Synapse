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

type SharingPromptFixture = Readonly<{
  body: string
  excerpt: string
  id: string
  slug: string
  summary: string
  title: string
  visibility: "FREE" | "PREMIUM"
}>

export type PromptSharingFixtures = Readonly<{
  current: SharingPromptFixture
  draft: SharingPromptFixture
  otherDomain: SharingPromptFixture
  outsideLimit: SharingPromptFixture
  suggestions: readonly SharingPromptFixture[]
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
  await db.prompt.create({
    data: {
      body: "Corps communication témoin",
      coverImage: null,
      domain: "communication",
      excerpt: "Extrait communication témoin",
      id: `${prefix}-communication-temoin`,
      publishedAt: new Date("2099-01-02T00:00:00.000Z"),
      slug: `${prefix}-communication-temoin`,
      summary: "Résumé communication témoin",
      tags: [prefix],
      title: `${prefix} Prompt communication témoin`,
      visibility: "FREE",
    },
  })
}

export async function insertPromptSharingFixtures(): Promise<PromptSharingFixtures> {
  const prefix = `t07-share-${randomUUID()}`
  createdPromptPrefixes.add(prefix)
  const fixture = (
    suffix: string,
    visibility: "FREE" | "PREMIUM",
  ): SharingPromptFixture => ({
    body: `BODY-SHARE-SECRET-${prefix}-${suffix}`,
    excerpt: `EXCERPT-SHARE-SECRET-${prefix}-${suffix}`,
    id: `${prefix}-${suffix}`,
    slug: `${prefix}-${suffix}`,
    summary: `Résumé partage ${suffix} ${prefix}`,
    title: `Prompt partage ${suffix} ${prefix}`,
    visibility,
  })
  const current = fixture("current", "FREE")
  const suggestions = [
    fixture("related-1", "PREMIUM"),
    fixture("related-2", "FREE"),
    fixture("related-3", "PREMIUM"),
  ] as const
  const outsideLimit = fixture("related-4", "FREE")
  const draft = fixture("draft", "PREMIUM")
  const otherDomain = fixture("other-domain", "PREMIUM")
  const datedRows = [
    { domain: "ia", prompt: current, publishedAt: "2099-08-06T10:00:00.000Z" },
    {
      domain: "ia",
      prompt: suggestions[0],
      publishedAt: "2099-08-05T10:00:00.000Z",
    },
    {
      domain: "ia",
      prompt: suggestions[1],
      publishedAt: "2099-08-04T10:00:00.000Z",
    },
    {
      domain: "ia",
      prompt: suggestions[2],
      publishedAt: "2099-08-03T10:00:00.000Z",
    },
    {
      domain: "ia",
      prompt: outsideLimit,
      publishedAt: "2099-08-02T10:00:00.000Z",
    },
    { domain: "ia", prompt: draft, publishedAt: null },
    {
      domain: "communication",
      prompt: otherDomain,
      publishedAt: "2099-08-07T10:00:00.000Z",
    },
  ] as const
  await db.prompt.createMany({
    data: datedRows.map(({ domain, prompt, publishedAt }) => ({
      body: prompt.body,
      coverImage: null,
      domain,
      excerpt: prompt.excerpt,
      id: prompt.id,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      slug: prompt.slug,
      summary: prompt.summary,
      tags: [`tag-${prompt.id}`],
      title: prompt.title,
      visibility: prompt.visibility,
    })),
  })
  return {
    current,
    draft,
    otherDomain,
    outsideLimit,
    suggestions,
  }
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
