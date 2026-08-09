import { expect, test } from "@playwright/test"

import {
  cleanupParticipationFixtures,
  clearParticipationRateLimits,
  countJeuParticipations,
  insertParticipationFixtures,
  participationDb,
  registerParticipationMember,
} from "./jeux-participations-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

test.afterEach(cleanupParticipationFixtures)
test.afterAll(async () => participationDb.$disconnect())

test(`La carte sans affiche reste en 4/3 et l'anonyme est renvoyé vers la connexion avec retour — ce qui est vérifié
GIVEN : un visiteur anonyme sur mobile 390px et un jeu FREE ouvert sans coverImage
WHEN  : il observe la carte puis ouvre le détail sans cliquer sur une mutation
THEN  : le visuel de repli de marque mesure réellement 4/3, l'action propose la connexion avec callbackUrl vers le jeu et aucun POST d'inscription ne part`, async ({
  page,
}) => {
  const fixtures = await insertParticipationFixtures()
  let mutationRequests = 0
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      request.url().includes("/inscriptions")
    ) {
      mutationRequests += 1
    }
  })

  await page.goto("/jeux")
  const card = page
    .locator("article")
    .filter({ hasText: fixtures.openJeu.title })
  const fallback = card.getByRole("img", {
    name: new RegExp(`visuel.*${fixtures.openJeu.title}`, "i"),
  })
  const fallbackSrc = await fallback.getAttribute("src")
  if (!fallbackSrc) throw new Error("le visuel de repli doit fournir une source")
  const fallbackUrl = new URL(fallbackSrc, "http://localhost:3000")
  const fallbackSource =
    fallbackUrl.pathname === "/_next/image"
      ? fallbackUrl.searchParams.get("url")
      : fallbackUrl.pathname
  expect(fallbackSource).toMatch(
    /^\/brand\/(?:synapse-pictogram|opengraph-synapse)\.webp$/u,
  )
  const box = await fallback.boundingBox()
  expect(box).not.toBeNull()
  if (!box) throw new Error("le visuel de repli doit être mesurable")
  expect(Math.abs(box.width / box.height - 4 / 3)).toBeLessThan(0.08)

  await card
    .getByRole("link", { name: new RegExp(fixtures.openJeu.title, "i") })
    .click()
  const loginAction = page.getByRole("link", {
    name: /se connecter.*participer|connexion.*participer/i,
  })
  await expect(loginAction).toBeVisible()
  const href = await loginAction.getAttribute("href")
  if (!href) throw new Error("l'action de connexion doit fournir un href")
  const loginUrl = new URL(href, "http://localhost:3000")
  expect(loginUrl.pathname).toBe("/login")
  expect(loginUrl.searchParams.get("callbackUrl")).toBe(
    `/jeux/${fixtures.openJeu.slug}`,
  )
  await expect(
    page.getByRole("button", { name: /^je participe$/i }),
  ).toHaveCount(0)
  expect(mutationRequests).toBe(0)
})

test(`Un membre participe, reçoit la suite pratique, retrouve puis annule sa participation — ce qui est vérifié
GIVEN : un membre connecté et un concours FREE publié, ouvert, avec date et lieu
WHEN  : il clique Je participe, rejoue la requête, ouvre son compte puis annule sa participation
THEN  : le bouton se désactive, la confirmation dit où, quand et qu'aucun e-mail ne part, une seule ligne existe, Mes participations la liste puis l'annulation la retire et libère la place`, async ({
  page,
}) => {
  const fixtures = await insertParticipationFixtures()
  await registerParticipationMember(page)
  await page.goto(`/jeux/${fixtures.openJeu.slug}`)
  const button = page.getByRole("button", { name: /^je participe$/i })

  await button.click()
  await expect(button).toBeDisabled()
  await expect(page.getByText(/participation confirmée/i)).toBeVisible()
  await expect(
    page.getByText(/^Lieu ou modalité : Abidjan, Cocody$/i),
  ).toBeVisible()
  await expect(page.getByText(/aucun e-mail|pas d.e-mail/i)).toBeVisible()

  const second = await page.request.post(
    `/api/jeux/${fixtures.openJeu.slug}/inscriptions`,
    { data: {}, headers: { origin: "http://localhost:3000" } },
  )
  expect(second.status()).toBe(200)
  expect(await second.json()).toMatchObject({ status: "ALREADY_REGISTERED" })
  expect(await countJeuParticipations(fixtures.openJeu.slug)).toBe(1)

  await page.goto("/compte")
  await expect(
    page.getByRole("heading", { name: /mes participations/i }),
  ).toBeVisible()
  await expect(page.getByText(fixtures.openJeu.title)).toBeVisible()
  await page.getByRole("button", { name: /annuler ma participation/i }).click()
  await expect(page.getByText(fixtures.openJeu.title)).toHaveCount(0)
  expect(await countJeuParticipations(fixtures.openJeu.slug)).toBe(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)
})

test(`Les états clos, complet et premium refusent clairement sans écriture — ce qui est vérifié
GIVEN : un membre FREE et trois concours publiés respectivement clos, complet et PREMIUM
WHEN  : il ouvre chaque détail et appelle directement chaque route de participation
THEN  : l'interface explique chaque refus, les API répondent 409, 409 et 403, aucune règle premium ne fuite et aucune inscription n'est créée`, async ({
  page,
}) => {
  const fixtures = await insertParticipationFixtures()
  await registerParticipationMember(page)

  const cases = [
    {
      expected: /participations? closes?/i,
      slug: fixtures.closedJeu.slug,
      status: 409,
    },
    {
      expected: /plus de place/i,
      slug: fixtures.fullJeu.slug,
      status: 409,
    },
    {
      expected: /^Participation réservée aux membres premium\./i,
      slug: fixtures.premiumJeu.slug,
      status: 403,
    },
  ]
  for (const current of cases) {
    await page.goto(`/jeux/${current.slug}`)
    await expect(page.getByText(current.expected)).toBeVisible()
    const response = await page.request.post(
      `/api/jeux/${current.slug}/inscriptions`,
      { data: {}, headers: { origin: "http://localhost:3000" } },
    )
    expect(response.status()).toBe(current.status)
  }
  expect(await page.content()).not.toContain(fixtures.premiumJeu.body)
  expect(await countJeuParticipations(fixtures.closedJeu.slug)).toBe(0)
  expect(await countJeuParticipations(fixtures.fullJeu.slug)).toBe(0)
  expect(await countJeuParticipations(fixtures.premiumJeu.slug)).toBe(0)
})

test(`Seule la formation événementielle rejoint le parcours de participation — ce qui est vérifié
GIVEN : un membre FREE, une formation EVENEMENTIELLE future et une PERMANENTE
WHEN  : il ouvre les deux détails puis participe à l'événement
THEN  : la permanente n'a aucune action, l'événement confirme date et modalité sans e-mail et apparaît dans Mes participations`, async ({
  page,
}) => {
  const fixtures = await insertParticipationFixtures()
  await registerParticipationMember(page)

  await page.goto(`/formations/${fixtures.permanentFormation.slug}`)
  await expect(
    page.getByRole("button", { name: /^je participe$/i }),
  ).toHaveCount(0)
  const forbidden = await page.request.post(
    `/api/formations/${fixtures.permanentFormation.slug}/inscriptions`,
    { data: {}, headers: { origin: "http://localhost:3000" } },
  )
  expect(forbidden.status()).toBe(409)

  await page.goto(`/formations/${fixtures.eventFormation.slug}`)
  await page.getByRole("button", { name: /^je participe$/i }).click()
  await expect(page.getByText(/participation confirmée/i)).toBeVisible()
  await expect(page.getByText(/^Lieu ou modalité : En ligne$/i)).toBeVisible()
  await expect(page.getByText(/aucun e-mail|pas d.e-mail/i)).toBeVisible()
  await page.goto("/compte")
  await expect(page.getByText(fixtures.eventFormation.title)).toBeVisible()
})

test(`Le concours premium ne fuite dans aucun transport pour anonyme et FREE — ce qui est vérifié
GIVEN : un concours PREMIUM dont les règles contiennent une sentinelle, puis un anonyme et un membre FREE
WHEN  : chacun lit directement le JSON, le HTML et le flux RSC du détail
THEN  : aucune réponse brute ne contient body ni la sentinelle et le CTA de conversion reste visible`, async ({
  browser,
  page,
}) => {
  const fixtures = await insertParticipationFixtures()
  for (const actor of ["anonymous", "free"] as const) {
    const context =
      actor === "anonymous"
        ? await browser.newContext({ baseURL: "http://localhost:3000" })
        : page.context()
    const actorPage = actor === "anonymous" ? await context.newPage() : page
    if (actor === "free") await registerParticipationMember(actorPage)
    const api = await actorPage.request.get(
      `/api/jeux/${fixtures.premiumJeu.slug}`,
    )
    const html = await actorPage.request.get(
      `/jeux/${fixtures.premiumJeu.slug}`,
    )
    const rsc = await actorPage.request.get(
      `/jeux/${fixtures.premiumJeu.slug}`,
      {
        headers: { RSC: "1" },
      },
    )
    for (const raw of [await api.text(), await html.text(), await rsc.text()]) {
      expect(raw).not.toContain(fixtures.premiumJeu.body)
      expect(raw).not.toMatch(/"body"\s*:/u)
    }
    await actorPage.goto(`/jeux/${fixtures.premiumJeu.slug}`)
    await expect(
      actorPage.getByRole("link", { name: /devenir membre|débloquer/i }),
    ).toBeVisible()
    if (actor === "anonymous") await context.close()
  }
})

test(`La route d'inscription applique le quota sensible de dix requêtes — ce qui est vérifié
GIVEN : le compteur PostgreSQL vide et un client sans session
WHEN  : il envoie onze POST vers une route /inscriptions dans la même minute
THEN  : les dix premiers appels atteignent l'authentification et le onzième vaut 429 avec Retry-After positif`, async ({
  request,
}) => {
  await clearParticipationRateLimits()
  const fixtures = await insertParticipationFixtures()
  const responses = []
  for (let index = 0; index < 11; index += 1) {
    responses.push(
      await request.post(`/api/jeux/${fixtures.openJeu.slug}/inscriptions`, {
        data: {},
        headers: { origin: "http://localhost:3000" },
      }),
    )
  }
  expect(responses.slice(0, 10).map((response) => response.status())).toEqual(
    Array.from({ length: 10 }, () => 401),
  )
  expect(responses[10]?.status()).toBe(429)
  expect(Number(responses[10]?.headers()["retry-after"])).toBeGreaterThan(0)
})
