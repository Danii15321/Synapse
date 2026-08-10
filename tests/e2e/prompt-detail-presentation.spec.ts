import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

test.use({ viewport: { height: 844, width: 390 } })

const db = new PrismaClient()
const createdSlugs = new Set<string>()

type DetailFixture = Readonly<{
  domain: "communication" | "productivite"
  excerpt: string
  slug: string
  summary: string
  tags: readonly [string, string]
  title: string
  visibility: "FREE" | "PREMIUM"
}>

async function insertDetailFixture(
  visibility: DetailFixture["visibility"],
): Promise<DetailFixture> {
  const suffix = randomUUID()
  const fixture: DetailFixture = {
    domain: visibility === "FREE" ? "communication" : "productivite",
    excerpt: `Extrait éditorial conservé ${visibility} ${suffix}`,
    slug: `detail-presentation-${visibility.toLowerCase()}-${suffix}`,
    summary: `Résumé à retirer du détail ${visibility} ${suffix}`,
    tags: [
      `TAG-DETAIL-${visibility}-INTERDIT-${suffix}`,
      `OUTIL-DETAIL-${visibility}-INTERDIT-${suffix}`,
    ],
    title: `Prompt détail ${visibility} ${suffix}`,
    visibility,
  }

  createdSlugs.add(fixture.slug)
  await db.prompt.create({
    data: {
      body: `Corps ${visibility} ${suffix}`,
      coverImage: null,
      domain: fixture.domain,
      excerpt: fixture.excerpt,
      publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      slug: fixture.slug,
      summary: fixture.summary,
      tags: [...fixture.tags],
      title: fixture.title,
      visibility: fixture.visibility,
    },
  })

  return fixture
}

test.afterEach(async () => {
  if (createdSlugs.size === 0) return
  await db.prompt.deleteMany({
    where: { slug: { in: Array.from(createdSlugs) } },
  })
  createdSlugs.clear()
})

test.afterAll(async () => db.$disconnect())

async function expectEditorialDetail(
  page: import("@playwright/test").Page,
  fixture: DetailFixture,
) {
  await page.goto(`/prompts/${fixture.slug}`)

  await expect(
    page.getByRole("heading", { name: fixture.title, exact: true }),
  ).toBeVisible()
  await expect(page.getByText(fixture.domain, { exact: true })).toHaveCount(0)
  for (const tag of fixture.tags) {
    await expect(page.getByText(tag, { exact: true })).toHaveCount(0)
  }
  await expect(page.getByText(fixture.summary, { exact: true })).toHaveCount(0)
  await expect(page.getByText(fixture.excerpt, { exact: true })).toBeVisible()

  const image = page.getByRole("main").getByRole("img")
  await expect(image).toBeVisible()
  const imageSource = decodeURIComponent((await image.getAttribute("src")) ?? "")
  expect(imageSource).toContain("/images/fallbacks/fallback-prompts.webp")

  return image
}

test(`Le détail PREMIUM montre le visuel du prompt verrouillé sans métadonnées éditoriales — ce qui est vérifié
GIVEN : un prompt PREMIUM publié sans coverImage, avec domaine, tags, résumé et extrait éditorial distincts
WHEN  : un visiteur ouvre son détail sur un viewport mobile de 390px
THEN  : domaine, tags et résumé ne sont pas rendus, l'extrait reste visible, le visuel éditorial partagé avec la carte remplace le carré géométrique, il est flouté et le cadenas Premium se superpose dessus`, async ({
  page,
}) => {
  const fixture = await insertDetailFixture("PREMIUM")
  const image = await expectEditorialDetail(page, fixture)

  expect(await image.evaluate((node) => getComputedStyle(node).filter)).not.toBe(
    "none",
  )
  const badge = page.getByText("Premium", { exact: true })
  await expect(badge).toBeVisible()
  expect(
    await page.getByRole("main").evaluate((main) => {
      const visual = main.querySelector("img")
      const premiumBadge = Array.from(main.querySelectorAll("span")).find(
        (node) => node.textContent?.trim() === "Premium",
      )
      if (
        !(visual instanceof HTMLImageElement) ||
        !(premiumBadge instanceof HTMLElement)
      ) {
        return false
      }
      const imageRect = visual.getBoundingClientRect()
      const badgeRect = premiumBadge.getBoundingClientRect()
      return (
        badgeRect.left < imageRect.right &&
        badgeRect.right > imageRect.left &&
        badgeRect.top < imageRect.bottom &&
        badgeRect.bottom > imageRect.top
      )
    }),
  ).toBe(true)
})

test(`Le détail FREE montre le visuel du prompt net sans métadonnées ni cadenas — ce qui est vérifié
GIVEN : un prompt FREE publié sans coverImage, avec domaine, tags, résumé et extrait éditorial distincts
WHEN  : un visiteur ouvre son détail sur un viewport mobile de 390px
THEN  : domaine, tags et résumé ne sont pas rendus, l'extrait reste visible, le visuel éditorial partagé avec la carte remplace le carré géométrique, il reste net et aucun badge Premium n'apparaît`, async ({
  page,
}) => {
  const fixture = await insertDetailFixture("FREE")
  const image = await expectEditorialDetail(page, fixture)

  expect(await image.evaluate((node) => getComputedStyle(node).filter)).toBe(
    "none",
  )
  await expect(page.getByText("Premium", { exact: true })).toHaveCount(0)
})
