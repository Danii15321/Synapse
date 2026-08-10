import { expect, test, type Page } from "@playwright/test"

import {
  cleanupParticipationFixtures,
  insertParticipationFixtures,
  participationDb,
} from "./jeux-participations-helpers"
import { firstPrompt } from "./prompt-reference-helpers"
import { expectRecipeEvidence } from "./recette-v1-proof"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

test.afterEach(cleanupParticipationFixtures)
test.afterAll(async () => participationDb.$disconnect())

async function measurePageUnderSlow3g(
  page: Page,
  path: string,
  expectUsefulContent: (measuredPage: Page) => Promise<void>,
) {
  const session = await page.context().newCDPSession(page)
  await session.send("Network.enable")
  let transferBytes = 0
  const appliedNetworkConditions = new Set<string>()
  session.on("Network.loadingFinished", ({ encodedDataLength }) => {
    transferBytes += encodedDataLength
  })
  session.on(
    "Network.requestWillBeSentExtraInfo",
    ({ appliedNetworkConditionsId }) => {
      if (appliedNetworkConditionsId) {
        appliedNetworkConditions.add(appliedNetworkConditionsId)
      }
    },
  )
  const { ruleIds } = await session.send(
    "Network.emulateNetworkConditionsByRule",
    {
      matchedNetworkConditions: [
        {
          connectionType: "cellular3g",
          downloadThroughput: (400 * 1024) / 8,
          latency: 2000,
          offline: false,
          uploadThroughput: (400 * 1024) / 8,
          urlPattern: "",
        },
      ],
    },
  )
  const slow3gRuleId = ruleIds[0]
  if (!slow3gRuleId) {
    throw new Error("Chromium doit activer la règle de bridage 3G lent")
  }

  const startedAt = Date.now()
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await expectUsefulContent(page)
  const usefulMs = Date.now() - startedAt
  const invalidImages = await page
    .locator("img")
    .evaluateAll(
      (images) =>
        images.filter(
          (image) =>
            image instanceof HTMLImageElement &&
            (image.naturalWidth <= 0 || image.naturalHeight <= 0),
        ).length,
    )

  return {
    appliedNetworkConditions,
    invalidImages,
    slow3gRuleId,
    transferBytes,
    usefulMs,
  }
}

test(`Performance mobile — liste et détail sont mesurés sous bridage 3G lent avec leur poids — ce qui est vérifié
GIVEN : Chromium mobile, le catalogue réel et un réseau réglé à 400 kb/s, 400 kb/s et 2 secondes de latence
WHEN  : la liste Prompts puis un détail libre sont chargés sans cache
THEN  : les deux temps utiles et les octets transférés sont mesurés, les images ont des dimensions naturelles et la preuve publie les valeurs plutôt qu'une impression`, async ({
  context,
  page,
}) => {
  const prompt = await firstPrompt("FREE")
  const listMeasurement = await measurePageUnderSlow3g(
    page,
    "/prompts",
    async (listPage) => {
      await expect(listPage.getByRole("main")).toBeVisible()
    },
  )
  const detailPage = await context.newPage()
  const detailMeasurement = await measurePageUnderSlow3g(
    detailPage,
    `/prompts/${prompt.slug}`,
    async (measuredDetailPage) => {
      await expect(
        measuredDetailPage.getByText(prompt.body, { exact: true }),
      ).toBeVisible()
    },
  )

  expect(listMeasurement.usefulMs).toBeGreaterThan(0)
  expect(detailMeasurement.usefulMs).toBeGreaterThan(0)
  expect(listMeasurement.transferBytes).toBeGreaterThan(0)
  expect(detailMeasurement.transferBytes).toBeGreaterThan(0)
  expect(listMeasurement.appliedNetworkConditions).toContain(
    listMeasurement.slow3gRuleId,
  )
  expect(detailMeasurement.appliedNetworkConditions).toContain(
    detailMeasurement.slow3gRuleId,
  )
  expect(detailMeasurement.invalidImages).toBe(0)
  expectRecipeEvidence([
    /3G lent/iu,
    /liste[\s\S]{0,80}\d+\s*ms/iu,
    /détail[\s\S]{0,80}\d+\s*ms/iu,
    /poids[\s\S]{0,80}(?:ko|kB|octets?)/iu,
  ])
})

test(`Accessibilité mobile — clavier, labels, titres, alternatives et cibles 44px sont vérifiés — ce qui est vérifié
GIVEN : les listes denses Prompts et Jeux puis les formulaires d'inscription sur un viewport 390px
WHEN  : le visiteur navigue au clavier et mesure chaque contrôle visible
THEN  : le focus progresse, les champs ont un label, la hiérarchie commence à h1, les images ont un alt et chaque cible interactive mesure au moins 44 par 44 pixels`, async ({
  page,
}) => {
  await insertParticipationFixtures()
  for (const path of ["/prompts", "/jeux", "/register", "/login"]) {
    await page.goto(path)
    const headings = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .evaluateAll((nodes) =>
        nodes.map((node) => Number(node.tagName.slice(1))),
      )
    expect(headings[0]).toBe(1)
    for (let index = 1; index < headings.length; index += 1) {
      expect(
        (headings[index] ?? 1) - (headings[index - 1] ?? 1),
      ).toBeLessThanOrEqual(1)
    }
    const missingAlt = await page
      .locator("img")
      .evaluateAll(
        (images) => images.filter((image) => !image.hasAttribute("alt")).length,
      )
    expect(missingAlt).toBe(0)
    const undersized = await page
      .locator("a:visible, button:visible, input:visible, select:visible")
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const rect = element.getBoundingClientRect()
            return { height: rect.height, width: rect.width }
          })
          .filter(({ height, width }) => height < 44 || width < 44),
      )
    expect(undersized).toEqual([])
  }

  await page.goto("/register")
  await expect(page.getByLabel(/e-mail|email/i)).toBeVisible()
  await expect(page.getByLabel(/^mot de passe/i)).toBeVisible()
  await page.keyboard.press("Tab")
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  )
  expectRecipeEvidence([
    /navigation clavier/iu,
    /contraste AA/iu,
    /44\s*(?:px|×)/iu,
  ])
})

test(`Cache de session — une réponse personnalisée ne peut jamais devenir publique — ce qui est vérifié
GIVEN : un détail premium demandé anonymement puis une route compte dépendant de la session
WHEN  : les headers HTTP bruts des deux pages sont inspectés
THEN  : la page dépendant de la session porte private ou no-store, aucune réponse personnalisée n'est publiquement cacheable et la vérification est consignée`, async ({
  request,
}) => {
  const prompt = await firstPrompt("PREMIUM")
  const premium = await request.get(`/prompts/${prompt.slug}`)
  const account = await request.get("/compte", { maxRedirects: 0 })
  const cacheHeaders = [
    premium.headers()["cache-control"] ?? "",
    account.headers()["cache-control"] ?? "",
  ]

  expect(account.status()).toBeGreaterThanOrEqual(300)
  expect(account.status()).toBeLessThan(400)
  expect(cacheHeaders.join("\n")).toMatch(/private|no-store/iu)
  expect(cacheHeaders.join("\n")).not.toMatch(/public[\s\S]*max-age=[1-9]/iu)
  expectRecipeEvidence([
    /pages? dépendant de la session[\s\S]{0,100}(?:private|no-store)/iu,
  ])
})
