import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test, type Page } from "@playwright/test"

import { completeRegistration } from "./auth-profile-helpers"

import {
  createResourceProject,
  removeResourceProject,
  runSeed,
  type ResourceProject,
  type SeedResult,
} from "../fixtures/resource-import-test-utils"

const db = new PrismaClient()
const createdEmails = new Set<string>()
let project: ResourceProject
let seedResult: SeedResult

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

async function clearEditorialData(): Promise<void> {
  await db.inscription.deleteMany()
  await db.formationInscription.deleteMany()
  await db.prompt.deleteMany()
  await db.formation.deleteMany()
  await db.opportunite.deleteMany()
  await db.jeu.deleteMany()
}

async function registerFreeMember(page: Page): Promise<string> {
  const email = `t11-${randomUUID()}@example.test`
  createdEmails.add(email)
  await page.goto("/register")
  await completeRegistration(page, {
    email,
    password: "MotDePasse!2026",
  })
  await page.waitForURL(/\/compte$/u)
  return email
}

async function registerPremiumMember(page: Page): Promise<void> {
  const email = await registerFreeMember(page)
  await db.user.update({
    data: { membership: "PREMIUM" },
    where: { email },
  })
}

test.beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL est requise pour le parcours d'import")
  }
  await clearEditorialData()
  project = await createResourceProject()
  seedResult = runSeed(project, databaseUrl)
})

test.afterAll(async () => {
  for (const email of createdEmails) {
    await db.user.deleteMany({ where: { email } })
  }
  await removeResourceProject(project)
  await db.$disconnect()
})

test(`Le seed charge 69 contenus puis la plateforme reste navigable à 390px sous réseau bridé — ce qui est vérifié
GIVEN : une base vide, 69 prompts synthétiques avec un corps très court et un corps de 200 lignes, et un viewport mobile sous réseau 3G dégradé
WHEN  : npx prisma db seed s'exécute, un membre PREMIUM ouvre la liste puis les deux détails extrêmes
THEN  : le rapport confirme 20 FREE/49 PREMIUM, les 69 cartes sont servies, les deux corps exacts s'affichent et aucune page ne déborde horizontalement`, async ({
  page,
}) => {
  expect(seedResult.status, seedResult.output).toBe(0)
  expect(seedResult.output).toMatch(
    /prompts?[\s\S]*FREE[\s:=|-]*20[\s\S]*PREMIUM[\s:=|-]*49/iu,
  )
  const response = await page.request.get("/api/prompts?take=100")
  const rawCatalog = await response.text()
  const payload: unknown = JSON.parse(rawCatalog)
  expect(response.status()).toBe(200)
  expect(payload).toMatchObject({ nextCursor: null })
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("items" in payload) ||
    !Array.isArray(payload.items)
  ) {
    throw new Error("le catalogue HTTP doit exposer items")
  }
  expect(payload.items).toHaveLength(69)

  await registerPremiumMember(page)
  const client = await page.context().newCDPSession(page)
  await client.send("Network.enable")
  await client.send("Network.emulateNetworkConditions", {
    connectionType: "cellular3g",
    downloadThroughput: 64 * 1024,
    latency: 300,
    offline: false,
    uploadThroughput: 32 * 1024,
  })

  await page.goto("/prompts")
  const firstCard = page.getByRole("main").locator("article").first()
  await expect(firstCard).toBeVisible()
  const fallbackImage = firstCard.getByRole("img")
  await expect(fallbackImage).toBeVisible()
  const fallbackBox = await fallbackImage.boundingBox()
  expect(fallbackBox).not.toBeNull()
  expect((fallbackBox?.width ?? 0) / (fallbackBox?.height ?? 1)).toBeCloseTo(
    4 / 3,
    1,
  )
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)

  const extremes = await db.prompt.findMany({
    orderBy: { slug: "asc" },
    select: { body: true, slug: true, title: true },
  })
  const byLength = [...extremes].sort((left, right) =>
    left.body.length === right.body.length
      ? left.slug.localeCompare(right.slug)
      : left.body.length - right.body.length,
  )
  const selected = [byLength[0], byLength.at(-1)]
  for (const prompt of selected) {
    if (!prompt) {
      throw new Error("les contenus extrêmes doivent exister")
    }
    await page.goto(`/prompts/${prompt.slug}`)
    await expect(
      page.getByRole("heading", { name: prompt.title, exact: true }),
    ).toBeVisible()
    await expect(page.getByText(prompt.body, { exact: true })).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
  }
})

test(`Anonyme et membre FREE ne reçoivent aucun corps premium importé dans le HTML ou le RSC bruts — ce qui est vérifié
GIVEN : un prompt PREMIUM synthétique importé avec body sentinelle, titre, summary et excerpt publics
WHEN  : un contexte anonyme puis une session database FREE demandent directement son HTML et son payload RSC
THEN  : les deux réponses 200 contiennent le teaser, mais ni clé body, ni corps exact, ni sentinelle brute, échappée ou encodée`, async ({
  browser,
  page,
}) => {
  const imported = await db.prompt.findFirst({
    select: {
      body: true,
      excerpt: true,
      slug: true,
      summary: true,
      title: true,
    },
    where: {
      body: { contains: "CORPS-SYNTHETIQUE" },
      visibility: "PREMIUM",
    },
  })
  if (!imported) {
    throw new Error("un prompt PREMIUM synthétique importé est requis")
  }
  const anonymousContext = await browser.newContext({
    baseURL: "http://localhost:3000",
    viewport: { height: 844, width: 390 },
  })
  const anonymousPage = await anonymousContext.newPage()
  await registerFreeMember(page)

  for (const actorPage of [anonymousPage, page]) {
    const htmlResponse = await actorPage.request.get(
      `/prompts/${imported.slug}`,
    )
    const rawHtml = await htmlResponse.text()
    const rscResponse = await actorPage.request.get(
      `/prompts/${imported.slug}`,
      { headers: { RSC: "1" } },
    )
    const rawRsc = await rscResponse.text()

    expect(htmlResponse.status()).toBe(200)
    expect(rscResponse.status()).toBe(200)
    for (const raw of [rawHtml, rawRsc]) {
      expect(raw).toContain(imported.title)
      expect(raw).toContain(imported.summary)
      if (imported.excerpt) {
        expect(raw).toContain(imported.excerpt)
      }
      expect(raw).not.toMatch(/"body"\s*:/u)
      expect(raw).not.toContain('\\"body\\":')
      expect(raw).not.toContain(imported.body)
      expect(raw).not.toContain(JSON.stringify(imported.body).slice(1, -1))
      expect(raw).not.toContain(encodeURIComponent(imported.body))
      expect(raw).not.toMatch(/CORPS-SYNTHETIQUE/iu)
    }
  }

  await anonymousContext.close()
})

test(`Le HTML malveillant importé reste inerte dans le HTML servi et dans le navigateur — ce qui est vérifié
GIVEN : un prompt importé dont le corps conservé contient un script qui écrit window.__synapseImportXss
WHEN  : un membre PREMIUM demande le HTML et le payload RSC bruts puis ouvre la page de détail
THEN  : aucun élément script portant la sentinelle n'est servi, la variable globale reste absente et le corps est seulement rendu comme texte`, async ({
  page,
}) => {
  const malicious = await db.prompt.findFirst({
    select: { body: true, slug: true },
    where: { body: { contains: "__synapseImportXss" } },
  })
  if (!malicious) {
    throw new Error("le prompt malveillant synthétique doit avoir été importé")
  }
  await registerPremiumMember(page)

  const htmlResponse = await page.request.get(`/prompts/${malicious.slug}`)
  const rawHtml = await htmlResponse.text()
  const rscResponse = await page.request.get(`/prompts/${malicious.slug}`, {
    headers: { RSC: "1" },
  })
  const rawRsc = await rscResponse.text()

  expect(htmlResponse.status()).toBe(200)
  expect(rawHtml).not.toContain(
    '<script>window.__synapseImportXss = "EXECUTED"</script>',
  )
  expect(rawRsc).not.toContain(
    '<script>window.__synapseImportXss = "EXECUTED"</script>',
  )
  await page.goto(`/prompts/${malicious.slug}`)
  expect(
    await page.evaluate(() => Reflect.get(window, "__synapseImportXss")),
  ).toBeUndefined()
  await expect(
    page.locator("script").filter({ hasText: "__synapseImportXss" }),
  ).toHaveCount(0)
  await expect(page.getByText(malicious.body, { exact: true })).toBeVisible()
})
