import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test, type Page } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

const db = new PrismaClient()
const homePremiumSlugs = new Set<string>()

type HomePremiumFixture = Readonly<{
  body: string
  slug: string
  title: string
}>

async function insertRecentPremiumPrompt(): Promise<HomePremiumFixture> {
  const suffix = randomUUID()
  const fixture = {
    body: `CORPS-ACCUEIL-PREMIUM-${suffix}`,
    slug: `accueil-premium-${suffix}`,
    title: `Prompt premium accueil ${suffix}`,
  }
  homePremiumSlugs.add(fixture.slug)
  await db.prompt.create({
    data: {
      body: fixture.body,
      coverImage: null,
      createdAt: new Date("2099-01-01T00:00:00.000Z"),
      domain: "ia",
      excerpt: "Extrait public pour la carte récente.",
      publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      slug: fixture.slug,
      summary: "Résumé public pour la carte récente.",
      tags: ["accueil"],
      title: fixture.title,
      visibility: "PREMIUM",
    },
  })
  return fixture
}

async function registerFreeMember(page: Page): Promise<void> {
  const email = `home-free-${randomUUID()}@example.test`
  const password = `Aa!${randomUUID()}2026`
  await page.goto("/register")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill(password)
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await expect(page).toHaveURL(/\/compte$/)
}

test.afterEach(async () => {
  if (homePremiumSlugs.size > 0) {
    await db.prompt.deleteMany({
      where: { slug: { in: Array.from(homePremiumSlugs) } },
    })
    homePremiumSlugs.clear()
  }
})

test.afterAll(async () => {
  await db.$disconnect()
})

test(`L'accueil anonyme ne reçoit que la carte teaser d'un prompt PREMIUM — ce qui est vérifié
GIVEN : un prompt PREMIUM récent dont le corps porte une sentinelle et aucun cookie de session
WHEN  : le visiteur demande le JSON brut de /api/home puis le HTML/RSC brut de /
THEN  : la carte récente et son titre public sont présents, tandis que la clé body et la sentinelle sont absentes de chaque réponse servie`, async ({
  page,
}) => {
  const fixture = await insertRecentPremiumPrompt()

  const apiResponse = await page.request.get("/api/home")
  const rawJson = await apiResponse.text()
  const htmlResponse = await page.request.get("/")
  const rawHtml = await htmlResponse.text()

  expect(apiResponse.status()).toBe(200)
  expect(rawJson).toContain(fixture.title)
  expect(rawJson).not.toMatch(/"body"\s*:/)
  expect(rawJson).not.toContain(fixture.body)
  expect(htmlResponse.status()).toBe(200)
  expect(rawHtml).toContain(fixture.title)
  expect(rawHtml).not.toContain(fixture.body)
  expect(rawHtml).not.toContain(JSON.stringify(fixture.body).slice(1, -1))
})

test(`L'accueil d'un membre FREE ne reçoit que la carte teaser d'un prompt PREMIUM — ce qui est vérifié
GIVEN : un prompt PREMIUM récent avec un corps sentinelle et une session database FREE active
WHEN  : le membre demande le JSON brut de /api/home puis le HTML/RSC brut de /
THEN  : le titre public de la carte est servi, mais aucune clé body ni aucun octet du corps premium n'apparaît dans les deux réponses`, async ({
  page,
}) => {
  const fixture = await insertRecentPremiumPrompt()
  await registerFreeMember(page)

  const apiResponse = await page.request.get("/api/home")
  const rawJson = await apiResponse.text()
  const htmlResponse = await page.request.get("/")
  const rawHtml = await htmlResponse.text()

  expect(apiResponse.status()).toBe(200)
  expect(rawJson).toContain(fixture.title)
  expect(rawJson).not.toMatch(/"body"\s*:/)
  expect(rawJson).not.toContain(fixture.body)
  expect(htmlResponse.status()).toBe(200)
  expect(rawHtml).toContain(fixture.title)
  expect(rawHtml).not.toContain(fixture.body)
  expect(rawHtml).not.toContain(JSON.stringify(fixture.body).slice(1, -1))
})
