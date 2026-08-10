import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

const db = new PrismaClient()
const presentationFixtureSlugs = new Set<string>()

type PresentationFixture = Readonly<{
  domain: string
  slug: string
  tags: readonly [string, string]
  title: string
  visibility: "FREE" | "PREMIUM"
}>

async function insertPresentationFixture(
  visibility: "FREE" | "PREMIUM",
): Promise<PresentationFixture> {
  const suffix = randomUUID()
  const fixture = {
    domain: visibility === "FREE" ? "communication" : "productivite",
    slug: `presentation-${visibility.toLowerCase()}-${suffix}`,
    tags: [
      `TAG-${visibility}-INTERDIT-${suffix}`,
      `OUTIL-${visibility}-INTERDIT-${suffix}`,
    ],
    title: `Prompt présentation ${visibility} ${suffix}`,
    visibility,
  } as const
  presentationFixtureSlugs.add(fixture.slug)
  await db.prompt.create({
    data: {
      body: `Corps ${visibility} ${suffix}`,
      coverImage: null,
      createdAt: new Date("2099-01-01T00:00:00.000Z"),
      domain: fixture.domain,
      excerpt: `Extrait public ${visibility} ${suffix}`,
      publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      slug: fixture.slug,
      summary: `Résumé public ${visibility} ${suffix}`,
      tags: [...fixture.tags],
      title: fixture.title,
      visibility: fixture.visibility,
    },
  })
  return fixture
}

test.afterEach(async () => {
  if (presentationFixtureSlugs.size === 0) return
  await db.prompt.deleteMany({
    where: { slug: { in: Array.from(presentationFixtureSlugs) } },
  })
  presentationFixtureSlugs.clear()
})

test.afterAll(async () => db.$disconnect())

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPromptDto(value: unknown): value is {
  coverImage: string | null
  domain: string
  id: string
  slug: string
  summary: string
  tags: string[]
  title: string
  visibility: string
} {
  return (
    isRecord(value) &&
    (typeof value.coverImage === "string" || value.coverImage === null) &&
    typeof value.domain === "string" &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.title === "string" &&
    typeof value.visibility === "string"
  )
}

test(`La route publique /prompts affiche une page bornée de prompts lus en base — ce qui est vérifié
GIVEN : PostgreSQL migré, le seed rejoué avec un volume éditorial non figé et un viewport mobile de 390px
WHEN  : un visiteur ouvre /prompts après lecture de la réponse HTTP brute de /api/prompts
THEN  : l'API renvoie une page stable items/nextCursor non vide d'au plus 24 DTO publics, toutes ses cartes sont visibles et aucun débordement horizontal n'apparaît`, async ({
  page,
  request,
}) => {
  const apiResponse = await request.get("/api/prompts")
  const rawBody = await apiResponse.text()

  expect(apiResponse.status()).toBe(200)
  const payload: unknown = JSON.parse(rawBody)
  expect(isRecord(payload)).toBe(true)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isPromptDto) ||
    !(typeof payload.nextCursor === "string" || payload.nextCursor === null)
  ) {
    throw new Error(
      "GET /api/prompts doit renvoyer une page { items, nextCursor }",
    )
  }
  expect(Object.keys(payload).sort()).toEqual(["items", "nextCursor"])
  expect(payload.items.length).toBeGreaterThan(0)
  expect(payload.items.length).toBeLessThanOrEqual(24)
  const firstPrompt = payload.items[0]
  if (!firstPrompt) {
    throw new Error("le seed doit fournir un premier prompt")
  }

  const pageResponse = await page.goto("/prompts")

  expect(pageResponse?.status()).toBe(200)
  const finalMain = page.getByRole("main").filter({
    has: page.getByRole("heading", { name: firstPrompt.title, exact: true }),
  })
  await expect(finalMain).toBeVisible()
  for (const prompt of payload.items) {
    await expect(
      finalMain.getByRole("heading", { name: prompt.title }),
    ).toBeVisible()
    await expect(
      finalMain.getByText(prompt.summary, { exact: true }),
    ).toBeVisible()
  }
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test(`La route de lecture refuse les méthodes non prévues — ce qui est vérifié
GIVEN : le BFF public de liste qui ne déclare qu'un GET
WHEN  : un client envoie un POST à /api/prompts
THEN  : la réponse HTTP brute porte exactement le statut 405 Method Not Allowed`, async ({
  request,
}) => {
  const response = await request.post("/api/prompts")

  expect(response.status()).toBe(405)
})

test(`La présentation mobile distingue visuellement les cartes FREE et PREMIUM sans afficher leurs mots-clés — ce qui est vérifié
GIVEN : une carte FREE et une carte PREMIUM publiées en tête du catalogue, avec des domaines distincts et des tags sentinelles
WHEN  : un visiteur ouvre /prompts sur un viewport de 390px et les styles réellement calculés sont mesurés
THEN  : aucune sentinelle de domaine ou tag n'est visible dans les cartes, seule l'image PREMIUM est floutée, et son cadenas avec le libellé Premium se superpose géométriquement au visuel`, async ({
  page,
}) => {
  const free = await insertPresentationFixture("FREE")
  const premium = await insertPresentationFixture("PREMIUM")

  await page.goto("/prompts")

  const cardFor = (fixture: PresentationFixture) =>
    page.getByRole("article").filter({
      has: page.getByRole("heading", { name: fixture.title, exact: true }),
    })
  const freeCard = cardFor(free)
  const premiumCard = cardFor(premium)
  await expect(freeCard).toBeVisible()
  await expect(premiumCard).toBeVisible()

  for (const fixture of [free, premium]) {
    const card = cardFor(fixture)
    await expect(card.getByText(fixture.domain, { exact: true })).toHaveCount(0)
    for (const tag of fixture.tags) {
      await expect(card.getByText(tag, { exact: true })).toHaveCount(0)
    }
  }

  const freeFilter = await freeCard
    .getByRole("img")
    .evaluate((image) => getComputedStyle(image).filter)
  const premiumFilter = await premiumCard
    .getByRole("img")
    .evaluate((image) => getComputedStyle(image).filter)
  expect(freeFilter).toBe("none")
  expect(premiumFilter).not.toBe("none")

  const premiumOverlay = await premiumCard.evaluate((article) => {
    const image = article.querySelector("img")
    const badge = Array.from(article.querySelectorAll("span")).find(
      (element) => element.textContent?.trim().toLowerCase() === "premium",
    )
    if (
      !(image instanceof HTMLImageElement) ||
      !(badge instanceof HTMLElement)
    ) {
      return false
    }
    const imageRect = image.getBoundingClientRect()
    const badgeRect = badge.getBoundingClientRect()
    return (
      badgeRect.left < imageRect.right &&
      badgeRect.right > imageRect.left &&
      badgeRect.top < imageRect.bottom &&
      badgeRect.bottom > imageRect.top
    )
  })
  expect(premiumOverlay).toBe(true)
  await expect(premiumCard.getByText("Premium", { exact: true })).toBeVisible()
})
