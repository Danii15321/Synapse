import { expect, test } from "@playwright/test"

import {
  cleanupReferenceFixtures,
  db,
  insertPromptSharingFixtures,
  registerFreeMember,
} from "./prompt-reference-helpers"

test.use({ viewport: { height: 844, width: 390 } })
test.describe.configure({ mode: "default" })

test.afterEach(cleanupReferenceFixtures)
test.afterAll(async () => db.$disconnect())

test(`Le détail suggère au plus trois cartes publiées du même domaine sans fuite Premium — ce qui est vérifié
GIVEN : un prompt courant FREE, quatre prompts liés ordonnés, un brouillon, un autre domaine et des bodies Premium sentinelles
WHEN  : un anonyme puis un membre FREE lisent le JSON du catalogue, le HTML, le RSC et ouvrent le détail
THEN  : les trois suggestions récentes seules apparaissent dans l'ordre, le courant et les exclusions sont absents, chaque carte partageable reste publique et aucun body ou excerpt lié ne fuite`, async ({
  browser,
  page,
}) => {
  const fixtures = await insertPromptSharingFixtures()
  const forbiddenSuggestions = [
    ...fixtures.suggestions,
    fixtures.outsideLimit,
    fixtures.draft,
    fixtures.otherDomain,
  ]

  for (const actor of ["anonymous", "free"] as const) {
    const context =
      actor === "anonymous"
        ? await browser.newContext({
            baseURL: "http://localhost:3000",
            viewport: { height: 844, width: 390 },
          })
        : page.context()
    const actorPage = actor === "anonymous" ? await context.newPage() : page
    if (actor === "free") await registerFreeMember(actorPage)

    const catalogResponse = await actorPage.request.get(
      "/api/prompts?domain=ia&take=100",
    )
    const rawJson = await catalogResponse.text()
    const htmlResponse = await actorPage.request.get(
      `/prompts/${fixtures.current.slug}`,
    )
    const rawHtml = await htmlResponse.text()
    const rscResponse = await actorPage.request.get(
      `/prompts/${fixtures.current.slug}`,
      { headers: { RSC: "1" } },
    )
    const rawRsc = await rscResponse.text()

    expect(catalogResponse.status()).toBe(200)
    expect(htmlResponse.status()).toBe(200)
    expect(rscResponse.status()).toBe(200)
    for (const prompt of forbiddenSuggestions) {
      for (const raw of [rawJson, rawHtml, rawRsc]) {
        expect(raw).not.toContain(prompt.body)
        expect(raw).not.toContain(prompt.excerpt)
      }
    }
    for (const suggestion of fixtures.suggestions) {
      expect(rawHtml).toContain(suggestion.title)
      expect(rawRsc).toContain(suggestion.title)
    }

    if (actor === "anonymous") await context.close()
  }

  await page.goto(`/prompts/${fixtures.current.slug}`)
  const relatedHeading = page.getByRole("heading", {
    name: /vous aimerez aussi/i,
  })
  await expect(relatedHeading).toBeVisible()
  const section = page.locator("section").filter({ has: relatedHeading })
  const cards = section.getByRole("article")
  await expect(cards).toHaveCount(3)
  await expect(
    section.getByRole("button", { name: /^partager$/i }),
  ).toHaveCount(3)
  expect(await section.locator("article h2").allTextContents()).toEqual(
    fixtures.suggestions.map((prompt) => prompt.title),
  )
  for (const excluded of [
    fixtures.current,
    fixtures.outsideLimit,
    fixtures.draft,
    fixtures.otherDomain,
  ]) {
    await expect(
      section.getByText(excluded.title, { exact: true }),
    ).toHaveCount(0)
  }
})

test(`Une carte FREE ou PREMIUM partage son URL en sécurité sur mobile — ce qui est vérifié
GIVEN : les suggestions liées incluent une carte FREE et une PREMIUM sur un viewport 390x844 avec presse-papiers autorisé
WHEN  : le visiteur copie le lien de la carte FREE puis choisit WhatsApp et Facebook dans son menu
THEN  : lien détail, flou/cadenas Premium et actions 44px restent intacts, les trois options illustrées ferment le menu et seules les URLs publiques exactes partent avec noopener/noreferrer sans overflow`, async ({
  page,
}) => {
  const fixtures = await insertPromptSharingFixtures()
  const premium = fixtures.suggestions[0]
  const free = fixtures.suggestions[1]
  if (!premium || !free) throw new Error("deux suggestions sont requises")
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto(`/prompts/${fixtures.current.slug}`)

  const section = page.locator("section").filter({
    has: page.getByRole("heading", { name: /vous aimerez aussi/i }),
  })
  const cardFor = (title: string) =>
    section.getByRole("article").filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    })
  const freeCard = cardFor(free.title)
  const premiumCard = cardFor(premium.title)
  await expect(freeCard).toBeVisible()
  await expect(premiumCard).toBeVisible()
  await expect(
    freeCard.getByRole("link", { name: free.title, exact: true }),
  ).toHaveAttribute("href", `/prompts/${free.slug}`)
  await expect(
    freeCard.locator(`a[href="/prompts/${free.slug}"] button`),
  ).toHaveCount(0)
  await expect(premiumCard.getByText(/premium/i)).toBeVisible()
  const premiumFilter = await premiumCard
    .getByRole("img")
    .evaluate((image) => getComputedStyle(image).filter)
  expect(premiumFilter).toContain("blur")
  await expect(
    premiumCard.getByRole("button", { name: /^partager$/i }),
  ).toBeVisible()

  const share = freeCard.getByRole("button", { name: /^partager$/i })
  const shareBox = await share.boundingBox()
  expect(shareBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(shareBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  await share.click()
  await expect(share).toHaveAttribute("aria-expanded", "true")
  const menu = page.getByRole("menu")
  const options = menu.getByRole("menuitem")
  await expect(options).toHaveCount(3)
  expect(await options.allTextContents()).toEqual([
    "Copier le lien",
    "WhatsApp",
    "Facebook",
  ])
  const iconMarkup: string[] = []
  for (const option of await options.all()) {
    const optionBox = await option.boundingBox()
    expect(optionBox?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(optionBox?.width ?? 0).toBeGreaterThanOrEqual(44)
    await expect(option.locator("svg")).toHaveCount(1)
    iconMarkup.push(await option.locator("svg").innerHTML())
  }
  expect(new Set(iconMarkup).size).toBe(3)

  const absoluteUrl = `http://localhost:3000/prompts/${free.slug}`
  await menu.getByRole("menuitem", { name: "Copier le lien" }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    absoluteUrl,
  )
  await expect(freeCard.getByRole("status")).toContainText(/copié/i)
  await expect(menu).toHaveCount(0)
  await expect(share).toHaveAttribute("aria-expanded", "false")

  await page.evaluate(() => {
    const calls: Array<{
      features: string | undefined
      target: string | undefined
      url: string
    }> = []
    Reflect.set(window, "__synapseShareCalls", calls)
    Object.defineProperty(window, "open", {
      configurable: true,
      value: (
        url?: string | URL,
        target?: string,
        features?: string,
      ): Window | null => {
        calls.push({ features, target, url: String(url) })
        return null
      },
    })
  })
  await share.click()
  await page.getByRole("menuitem", { name: "WhatsApp" }).click()
  await expect(share).toHaveAttribute("aria-expanded", "false")
  expect(
    await page.evaluate(() => Reflect.get(window, "__synapseShareCalls")),
  ).toEqual([
    {
      features: "noopener,noreferrer",
      target: "_blank",
      url: `https://wa.me/?text=${encodeURIComponent(`${free.title} ${absoluteUrl}`)}`,
    },
  ])

  await share.click()
  await page.getByRole("menuitem", { name: "Facebook" }).click()
  await expect(share).toHaveAttribute("aria-expanded", "false")
  const calls: unknown = await page.evaluate(() =>
    Reflect.get(window, "__synapseShareCalls"),
  )
  expect(calls).toEqual([
    {
      features: "noopener,noreferrer",
      target: "_blank",
      url: `https://wa.me/?text=${encodeURIComponent(`${free.title} ${absoluteUrl}`)}`,
    },
    {
      features: "noopener,noreferrer",
      target: "_blank",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`,
    },
  ])
  const serializedCalls = JSON.stringify(calls)
  for (const forbidden of [
    free.body,
    free.excerpt,
    free.summary,
    `tag-${free.id}`,
    "ia",
  ]) {
    expect(serializedCalls).not.toContain(forbidden)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)
})
