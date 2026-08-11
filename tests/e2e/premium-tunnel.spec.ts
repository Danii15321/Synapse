import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import {
  cleanupPremiumTunnelMembers,
  membershipGrantSnapshot,
  premiumTunnelDb,
  registerFreePremiumMember,
} from "./premium-tunnel-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

const PRICE_PATTERN = /7[\s\u00a0\u202f]*550\s*FCFA/iu
const OFFER_TITLE = "Accès à vie Synapse Premium"
const OFFER_DESCRIPTION =
  "Obtenez un accès illimité et permanent à l’ensemble du contenu Premium de Synapse — prompts, formations, jeux, opportunités et toutes les futures mises à jour — avec un unique paiement."

type PublishedRow = Readonly<{ id: string; publishedAt: Date }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function hidePublishedPremiumContents(): Promise<() => Promise<void>> {
  const [prompts, formations, jeux, opportunites] = await Promise.all([
    premiumTunnelDb.$queryRaw<PublishedRow[]>`
      SELECT "id", "publishedAt" FROM "Prompt"
      WHERE "visibility" = 'PREMIUM'::"Visibility" AND "publishedAt" IS NOT NULL
    `,
    premiumTunnelDb.$queryRaw<PublishedRow[]>`
      SELECT "id", "publishedAt" FROM "Formation"
      WHERE "visibility" = 'PREMIUM'::"Visibility" AND "publishedAt" IS NOT NULL
    `,
    premiumTunnelDb.$queryRaw<PublishedRow[]>`
      SELECT "id", "publishedAt" FROM "Jeu"
      WHERE "visibility" = 'PREMIUM'::"Visibility" AND "publishedAt" IS NOT NULL
    `,
    premiumTunnelDb.$queryRaw<PublishedRow[]>`
      SELECT "id", "publishedAt" FROM "Opportunite"
      WHERE "visibility" = 'PREMIUM'::"Visibility" AND "publishedAt" IS NOT NULL
    `,
  ])
  await Promise.all([
    premiumTunnelDb.$executeRaw`
      UPDATE "Prompt" SET "publishedAt" = NULL
      WHERE "visibility" = 'PREMIUM'::"Visibility"
    `,
    premiumTunnelDb.$executeRaw`
      UPDATE "Formation" SET "publishedAt" = NULL
      WHERE "visibility" = 'PREMIUM'::"Visibility"
    `,
    premiumTunnelDb.$executeRaw`
      UPDATE "Jeu" SET "publishedAt" = NULL
      WHERE "visibility" = 'PREMIUM'::"Visibility"
    `,
    premiumTunnelDb.$executeRaw`
      UPDATE "Opportunite" SET "publishedAt" = NULL
      WHERE "visibility" = 'PREMIUM'::"Visibility"
    `,
  ])

  return async () => {
    for (const row of prompts) {
      await premiumTunnelDb.$executeRaw`
        UPDATE "Prompt" SET "publishedAt" = ${row.publishedAt}
        WHERE "id" = ${row.id}
      `
    }
    for (const row of formations) {
      await premiumTunnelDb.$executeRaw`
        UPDATE "Formation" SET "publishedAt" = ${row.publishedAt}
        WHERE "id" = ${row.id}
      `
    }
    for (const row of jeux) {
      await premiumTunnelDb.$executeRaw`
        UPDATE "Jeu" SET "publishedAt" = ${row.publishedAt}
        WHERE "id" = ${row.id}
      `
    }
    for (const row of opportunites) {
      await premiumTunnelDb.$executeRaw`
        UPDATE "Opportunite" SET "publishedAt" = ${row.publishedAt}
        WHERE "id" = ${row.id}
      `
    }
  }
}

async function addPublishedPremiumPrompts(count: number): Promise<string[]> {
  const fixtureId = randomUUID()
  const ids = Array.from(
    { length: count },
    (_, index) => `t10-offer-${fixtureId}-${index}`,
  )
  await premiumTunnelDb.prompt.createMany({
    data: ids.map((id) => ({
      body: `Corps ${id}`,
      excerpt: `Extrait ${id}`,
      id,
      publishedAt: new Date(),
      slug: id,
      summary: `Résumé ${id}`,
      title: `Prompt ${id}`,
      visibility: "PREMIUM",
    })),
  })
  return ids
}

test.afterEach(cleanupPremiumTunnelMembers)
test.afterAll(async () => premiumTunnelDb.$disconnect())

test(`L'offre publique reprend la proposition de valeur Premium sans volume inventé — ce qui est vérifié
GIVEN : un visiteur anonyme et un volume de prompts PREMIUM publiés volontairement différent de 49
WHEN  : il demande le HTML brut puis ouvre /premium sur un viewport de 390px
THEN  : la maquette adaptée affiche la promesse, le prix, cinq bénéfices, le seul volume Prompts réel, les accès inscription et connexion ainsi qu'un support local, sans faux chiffre, contact WhatsApp public, Atalakou, logo opérateur ni débordement`, async ({
  page,
}) => {
  const initialPromptCount = await premiumTunnelDb.prompt.count({
    where: { publishedAt: { not: null }, visibility: "PREMIUM" },
  })
  const extraCount = initialPromptCount + 1 === 49 ? 2 : 1
  const promptIds = await addPublishedPremiumPrompts(extraCount)
  const expectedPromptCount = initialPromptCount + extraCount
  expect(expectedPromptCount).not.toBe(49)

  try {
    const response = await page.request.get("/premium")
    const rawHtml = await response.text()

    expect(response.status()).toBe(200)
    expect(rawHtml).toContain(OFFER_TITLE)
    expect(rawHtml).toMatch(PRICE_PATTERN)
    expect(rawHtml).toMatch(/aucun abonnement/iu)

    await page.goto("/premium")
    const main = page.getByRole("main")
    await expect(
      main.getByText("Synapse Premium", { exact: true }).first(),
    ).toBeVisible()
    await expect(
      main.getByRole("heading", { level: 1, name: OFFER_TITLE, exact: true }),
    ).toBeVisible()
    await expect(
      main.getByText(OFFER_DESCRIPTION, { exact: true }),
    ).toBeVisible()
    await expect(main).toContainText(PRICE_PATTERN)
    await expect(main).toContainText(/aucun abonnement/iu)

    const benefits = main
      .getByRole("list")
      .filter({ hasText: /prompts Premium/iu })
      .getByRole("listitem")
    await expect(benefits).toHaveCount(5)
    await expect(benefits.nth(0)).toContainText(
      new RegExp(`${expectedPromptCount}\\+?\\s+prompts Premium`, "iu"),
    )
    for (const pattern of [
      /formations et ressources exclusives/iu,
      /jeux & concours Premium/iu,
      /meilleures opportunités/iu,
      /futurs contenus Premium inclus/iu,
    ]) {
      const benefit = benefits.filter({ hasText: pattern })
      await expect(benefit).toHaveCount(1)
      expect(await benefit.innerText()).not.toMatch(/\d/u)
    }

    await expect(
      main.getByRole("link", {
        name: "Débloquer Synapse Premium",
        exact: true,
      }),
    ).toHaveAttribute("href", "/register")
    await expect(
      main.getByRole("link", { name: "Se connecter", exact: true }),
    ).toHaveAttribute("href", "/login")
    await expect(main).toContainText(/une question|besoin.*aide|support/iu)
    await expect(
      main.getByRole("link", { name: /contact|aide|support/iu }),
    ).toHaveAttribute("href", "/contact")

    const visibleOfferText = await main.innerText()
    expect(visibleOfferText).not.toMatch(
      /Atalakou|\+?33[\s.-]*6[\s.-]*68[\s.-]*82[\s.-]*30[\s.-]*12|2250703381175/iu,
    )
    const initialHrefs = await main
      .getByRole("link")
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")))
    expect(initialHrefs.join("\n")).not.toMatch(/wa\.me/iu)

    const brandImages = await page
      .locator("img")
      .evaluateAll((images) =>
        images.map(
          (image) =>
            `${image.getAttribute("alt")} ${image.getAttribute("src")}`,
        ),
      )
    expect(brandImages.join("\n")).not.toMatch(/wave|orange|mtn|moov/iu)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false)
  } finally {
    await premiumTunnelDb.prompt.deleteMany({
      where: { id: { in: promptIds } },
    })
  }
})

test(`Un membre FREE parcourt le tunnel sans aucune mutation User ni MembershipGrant et garde ses données hors de l'URL WhatsApp — ce qui est vérifié
GIVEN : un membre FREE connecté, le formulaire strict et un instantané complet de toutes les lignes User et MembershipGrant
WHEN  : il lit le récapitulatif, choisit Wave, saisit ses coordonnées puis copie et ouvre la conversation administrateur
THEN  : l'e-mail est en lecture seule, les actions tactiles font au moins 44px, le presse-papiers contient le récapitulatif, wa.me/33668823012 s'ouvre sans query ni donnée personnelle, l'écran final dit que l'administrateur doit encore vérifier le paiement et chaque ligne User et MembershipGrant reste strictement identique`, async ({
  page,
}) => {
  const email = await registerFreePremiumMember(page)
  const beforeUsers = await premiumTunnelDb.user.findMany({
    orderBy: { id: "asc" },
    select: {
      createdAt: true,
      email: true,
      emailVerified: true,
      id: true,
      image: true,
      membership: true,
      name: true,
      passwordHash: true,
      updatedAt: true,
    },
  })
  const beforeGrants = await membershipGrantSnapshot()
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: "http://localhost:3000",
  })
  await page.context().route("https://wa.me/**", async (route) => {
    await route.fulfill({ body: "Conversation WhatsApp", status: 200 })
  })

  await page.goto("/premium")
  const start = page
    .getByRole("button", {
      name: /commencer|demander|continuer|choisir.*premium/i,
    })
    .or(
      page.getByRole("link", {
        name: /commencer|demander|continuer|choisir.*premium/i,
      }),
    )
    .first()
  await expect(start).toBeVisible()
  const startBox = await start.boundingBox()
  expect(startBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(startBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  await start.click()

  await expect(
    page.getByRole("heading", { name: /récapitulatif/i }),
  ).toBeVisible()
  await expect(page.getByRole("main")).toContainText(PRICE_PATTERN)
  const continueAction = page.getByRole("button", {
    name: /continuer|choisir.*moyen|coordonnées/i,
  })
  await continueAction.click()

  const fullName = "Awa Kouassi"
  const whatsappNumber = "+2250701020304"
  const emailInput = page.getByLabel(/e-mail|email/i)
  await expect(emailInput).toHaveValue(email)
  await expect(emailInput).toHaveAttribute("readonly", "")
  await page.getByLabel(/nom complet/i).fill(fullName)
  await page
    .getByLabel(/numéro.*whatsapp|whatsapp.*numéro/i)
    .fill(whatsappNumber)
  await expect(page.getByRole("radio", { name: /mobile money/i })).toBeVisible()
  await page.getByRole("radio", { name: /^wave$/i }).check()

  const contactAction = page.getByRole("button", {
    name: /copier.*(?:ouvrir|whatsapp)|(?:ouvrir|whatsapp).*copier|contacter.*whatsapp/i,
  })
  const contactBox = await contactAction.boundingBox()
  expect(contactBox?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(contactBox?.width ?? 0).toBeGreaterThanOrEqual(44)
  const whatsappRequest = page.waitForRequest((request) => {
    try {
      return new URL(request.url()).hostname === "wa.me"
    } catch {
      return false
    }
  })
  await contactAction.click()
  const request = await whatsappRequest
  const openedUrl = new URL(request.url())
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())

  expect(openedUrl.protocol).toBe("https:")
  expect(openedUrl.hostname).toBe("wa.me")
  expect(openedUrl.pathname).toBe("/33668823012")
  expect(openedUrl.search).toBe("")
  expect(openedUrl.hash).toBe("")
  expect(decodeURIComponent(openedUrl.href)).not.toContain(fullName)
  expect(decodeURIComponent(openedUrl.href)).not.toContain(email)
  expect(decodeURIComponent(openedUrl.href)).not.toContain(whatsappNumber)
  expect(clipboard).toContain(fullName)
  expect(clipboard).toContain(email)
  expect(clipboard).toContain(whatsappNumber)
  expect(clipboard).toMatch(/wave/iu)
  expect(clipboard).toMatch(PRICE_PATTERN)

  const finalScreen = page.getByRole("main")
  await expect(finalScreen).toContainText(
    /administrateur.*(?:vérif|valid)|(?:vérif|valid).*administrateur/iu,
  )
  await expect(finalScreen).toContainText(/coller|envoyer.*message/iu)
  const finalText = await finalScreen.innerText()
  expect(finalText).not.toMatch(
    /paiement (?:effectué|confirmé|réussi)|commande confirmée/iu,
  )

  const afterUsers = await premiumTunnelDb.user.findMany({
    orderBy: { id: "asc" },
    select: {
      createdAt: true,
      email: true,
      emailVerified: true,
      id: true,
      image: true,
      membership: true,
      name: true,
      passwordHash: true,
      updatedAt: true,
    },
  })
  expect(afterUsers).toEqual(beforeUsers)
  expect(await membershipGrantSnapshot()).toEqual(beforeGrants)
})

test(`L'offre rend un état empty accessible quand aucun contenu PREMIUM n'est publié — ce qui est vérifié
GIVEN : les quatre rubriques sans aucun contenu à la fois PREMIUM et publié, les dates initiales étant sauvegardées
WHEN  : un visiteur anonyme ouvre directement /premium
THEN  : la page répond 200 et son main annonce explicitement qu'aucun contenu premium n'est disponible, puis toutes les dates sont restaurées`, async ({
  page,
}) => {
  const restore = await hidePublishedPremiumContents()
  try {
    const response = await page.goto("/premium")

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("main")).toContainText(
      /aucun contenu premium|aucun contenu.*disponible/i,
    )
  } finally {
    await restore()
  }
})

test(`Un membre PREMIUM conserve son entitlement après avoir visité l'offre — ce qui est vérifié
GIVEN : un membre promu PREMIUM, sa session database et un prompt PREMIUM publié
WHEN  : il lit le corps premium, ouvre /premium puis relit l'API sans reconnexion
THEN  : /premium répond 200, le corps reste servi avant et après et son membership demeure PREMIUM sans nouvelle trace d'attribution`, async ({
  page,
}) => {
  const email = await registerFreePremiumMember(page)
  const user = await premiumTunnelDb.user.update({
    data: { membership: "PREMIUM" },
    select: { id: true },
    where: { email },
  })
  const prompt = await premiumTunnelDb.prompt.findFirst({
    orderBy: { slug: "asc" },
    select: { body: true, slug: true },
    where: { publishedAt: { not: null }, visibility: "PREMIUM" },
  })
  if (!prompt) throw new Error("le seed doit fournir un prompt PREMIUM publié")

  const before = await page.request.get(`/api/prompts/${prompt.slug}`)
  const beforePayload: unknown = await before.json()
  expect(isRecord(beforePayload)).toBe(true)
  if (!isRecord(beforePayload)) {
    throw new Error("la réponse entitled avant l'offre doit être un objet JSON")
  }
  expect(beforePayload.body).toBe(prompt.body)
  const offer = await page.goto("/premium")
  expect(offer?.status()).toBe(200)
  const after = await page.request.get(`/api/prompts/${prompt.slug}`)
  const afterPayload: unknown = await after.json()
  expect(isRecord(afterPayload)).toBe(true)
  if (!isRecord(afterPayload)) {
    throw new Error("la réponse entitled après l'offre doit être un objet JSON")
  }
  expect(afterPayload.body).toBe(prompt.body)

  const persisted = await premiumTunnelDb.user.findUnique({
    select: { membership: true },
    where: { id: user.id },
  })
  expect(persisted).toEqual({ membership: "PREMIUM" })
  const tables = await premiumTunnelDb.$queryRaw<Array<{ tableName: string }>>`
    SELECT table_name AS "tableName"
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'MembershipGrant'
  `
  if (tables.length > 0) {
    const traces = await premiumTunnelDb.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "MembershipGrant" WHERE "userId" = ${user.id}
    `
    expect(Number(traces[0]?.count ?? 0)).toBe(0)
  }
})
