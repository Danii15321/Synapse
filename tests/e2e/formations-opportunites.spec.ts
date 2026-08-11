import { expect, test } from "@playwright/test"

import {
  cleanupReplicatedFixtures,
  insertReplicatedFixtures,
  registerReplicatedMember,
  replicatedDb,
} from "./formations-opportunites-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

test.afterEach(cleanupReplicatedFixtures)
test.afterAll(async () => replicatedDb.$disconnect())

test(`Formations et Opportunités reproduisent le patron à 390px avec les règles temporelles décidées — ce qui est vérifié
GIVEN : une formation permanente, un événement futur, un événement passé, une opportunité future et une expirée
WHEN  : un visiteur parcourt les deux listes puis ouvre les contenus accessibles
THEN  : permanente et futurs sont visibles en cartes 4/3 sans débordement, les contenus passés sont absents, la permanente se consulte sans inscription et l'opportunité expirée n'a aucune archive`, async ({
  page,
}) => {
  const fixtures = await insertReplicatedFixtures()

  await page.goto("/formations")
  await expect(
    page.getByRole("heading", { name: fixtures.permanentFormation.title }),
  ).toBeVisible()
  await expect(
    page.getByRole("heading", { name: fixtures.futureFormation.title }),
  ).toBeVisible()
  await expect(page.getByText(/Atelier passé/u)).toHaveCount(0)
  const cardImageBox = await page
    .getByRole("main")
    .locator("article")
    .first()
    .getByRole("img")
    .boundingBox()
  expect(cardImageBox).not.toBeNull()
  if (!cardImageBox) throw new Error("le visuel de carte doit être mesurable")
  expect(
    Math.abs(cardImageBox.width / cardImageBox.height - 4 / 3),
  ).toBeLessThan(0.08)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)

  await page
    .getByRole("link", {
      name: new RegExp(fixtures.permanentFormation.title, "i"),
    })
    .click()
  await expect(page.getByText(fixtures.permanentFormation.body)).toBeVisible()
  await expect(page.getByRole("link", { name: /inscri/i })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /inscri/i })).toHaveCount(0)

  await page.goto("/opportunites")
  await expect(
    page.getByRole("heading", { name: fixtures.premiumOpportunity.title }),
  ).toBeVisible()
  await expect(page.getByText(fixtures.expiredOpportunity.title)).toHaveCount(0)
  const expiredApi = await page.request.get(
    `/api/opportunites/${fixtures.expiredOpportunity.slug}`,
  )
  expect(expiredApi.status()).toBe(404)

  await page.goto(`/opportunites/${fixtures.expiredOpportunity.slug}`)
  await expect(page.getByRole("main")).toContainText(
    /opportunité.*introuvable|aucune opportunité/i,
  )
  await expect(page.getByText(fixtures.expiredOpportunity.title)).toHaveCount(0)
  expect(await page.content()).not.toContain("BODY EXPIRE")
  await expect(
    page.locator('a[href="https://example.test/expire"]'),
  ).toHaveCount(0)
})

test(`Le verrouillage serveur couvre body et externalUrl dans les deux rubriques — ce qui est vérifié
GIVEN : une formation et une opportunité PREMIUM avec trois sentinelles, puis un anonyme et un membre FREE
WHEN  : chacun lit directement JSON, HTML et RSC avant qu'un membre PREMIUM ouvre les détails
THEN  : aucun octet verrouillé n'atteint les non entitled, le CTA membre reste visible, et le membre PREMIUM reçoit le programme, le corps et le lien exacts`, async ({
  browser,
  page,
}) => {
  const fixtures = await insertReplicatedFixtures()
  const premiumResources = [
    {
      api: `/api/formations/${fixtures.futureFormation.slug}`,
      body: fixtures.futureFormation.body,
      page: `/formations/${fixtures.futureFormation.slug}`,
      url: null,
    },
    {
      api: `/api/opportunites/${fixtures.premiumOpportunity.slug}`,
      body: fixtures.premiumOpportunity.body,
      page: `/opportunites/${fixtures.premiumOpportunity.slug}`,
      url: fixtures.premiumOpportunity.externalUrl,
    },
  ]
  let freeEmail: string | null = null

  for (const actor of ["anonymous", "free"] as const) {
    const context =
      actor === "anonymous"
        ? await browser.newContext({ baseURL: "http://localhost:3000" })
        : page.context()
    const actorPage = actor === "anonymous" ? await context.newPage() : page
    if (actor === "free") freeEmail = await registerReplicatedMember(actorPage)

    for (const resource of premiumResources) {
      const apiResponse = await actorPage.request.get(resource.api)
      const rawJson = await apiResponse.text()
      const htmlResponse = await actorPage.request.get(resource.page)
      const rawHtml = await htmlResponse.text()
      const rscResponse = await actorPage.request.get(resource.page, {
        headers: { RSC: "1" },
      })
      const rawRsc = await rscResponse.text()

      expect(apiResponse.status()).toBe(200)
      expect(rawJson).not.toMatch(/"body"|"externalUrl"/u)
      expect(rawJson).not.toContain(resource.body)
      expect(rawHtml).not.toContain(resource.body)
      expect(rawRsc).not.toContain(resource.body)
      if (resource.url) {
        expect(rawJson).not.toContain(resource.url)
        expect(rawHtml).not.toContain(resource.url)
        expect(rawRsc).not.toContain(resource.url)
      }
      await actorPage.goto(resource.page)
      await expect(
        actorPage
          .getByRole("main")
          .getByRole("link", { name: /devenir membre|débloquer/i }),
      ).toBeVisible()
    }
    if (actor === "anonymous") await context.close()
  }

  if (!freeEmail) throw new Error("le membre FREE de preuve doit exister")
  await replicatedDb.user.update({
    data: { membership: "PREMIUM" },
    where: { email: freeEmail },
  })
  await page.goto(`/formations/${fixtures.futureFormation.slug}`)
  await expect(page.getByText(fixtures.futureFormation.body)).toBeVisible()
  await page.goto(`/opportunites/${fixtures.premiumOpportunity.slug}`)
  await expect(page.getByText(fixtures.premiumOpportunity.body)).toBeVisible()
  await expect(
    page.getByRole("link", { name: /candidater|postuler/i }),
  ).toHaveAttribute("href", fixtures.premiumOpportunity.externalUrl)
})
