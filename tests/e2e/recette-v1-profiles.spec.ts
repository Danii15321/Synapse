import { expect, test } from "@playwright/test"

import {
  cleanupReplicatedFixtures,
  insertReplicatedFixtures,
  replicatedDb,
} from "./formations-opportunites-helpers"
import {
  cleanupParticipationFixtures,
  insertParticipationFixtures,
  participationDb,
  registerParticipationMember,
} from "./jeux-participations-helpers"
import { firstPrompt } from "./prompt-reference-helpers"
import { expectRecipeEvidence } from "./recette-v1-proof"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

async function insertFreeOpportunity(premiumSlug: string) {
  const prefix = premiumSlug.replace(/-opportunite-future$/u, "")
  const fixture = {
    body: `BODY-LIBRE-${prefix}`,
    slug: `${prefix}-opportunite-libre`,
    title: `${prefix} Opportunité libre`,
  }
  await replicatedDb.$executeRaw`
    INSERT INTO "Opportunite" (
      "id", "slug", "title", "summary", "excerpt", "body", "visibility",
      "publishedAt", "type", "organisme", "deadline", "externalUrl",
      "coverImage", "createdAt", "updatedAt"
    ) VALUES (
      ${`${prefix}-opportunite-libre`}, ${fixture.slug}, ${fixture.title},
      'Résumé public', 'Extrait public', ${fixture.body}, 'FREE'::"Visibility",
      NOW(), 'COLLABORATION'::"OpportuniteType", 'Synapse',
      NOW() + INTERVAL '60 days', 'https://example.test/libre', NULL, NOW(), NOW()
    )
  `
  return fixture
}

test.afterEach(async () => {
  await cleanupParticipationFixtures()
  await cleanupReplicatedFixtures()
})

test.afterAll(async () => {
  await participationDb.$disconnect()
  await replicatedDb.$disconnect()
})

test(`Parcours v1 — le visiteur anonyme traverse les quatre rubriques puis crée son compte — ce qui est vérifié
GIVEN : les vrais prompts, des contenus FREE et PREMIUM dans chaque rubrique et un mobile 390px sans session
WHEN  : il part de l'accueil, visite chaque rubrique, lit les quatre contenus libres, comprend les quatre verrous, ouvre l'offre premium puis s'inscrit
THEN  : chaque corps libre est lisible, aucun corps premium ne l'est, les CTA mènent à l'offre ou l'inscription, le compte FREE est créé et la preuve du parcours est publiée`, async ({
  page,
}) => {
  const promptFree = await firstPrompt("FREE")
  const promptPremium = await firstPrompt("PREMIUM")
  const replicated = await insertReplicatedFixtures()
  const participation = await insertParticipationFixtures()
  const freeOpportunity = await insertFreeOpportunity(
    replicated.premiumOpportunity.slug,
  )

  for (const [name, path] of [
    [/^voir la rubrique prompts\b/i, "/prompts"],
    [/^voir la rubrique formations\b/i, "/formations"],
    [/^voir la rubrique jeux & concours\b/i, "/jeux"],
    [/^voir la rubrique bons plans & opportunités\b/i, "/opportunites"],
  ] as const) {
    await page.goto("/")
    const rubricLink = page.getByRole("main").getByRole("link", { name })
    await expect(rubricLink).toHaveAttribute("href", path)
    await rubricLink.click()
    await expect(page).toHaveURL(new RegExp(`${path}$`, "u"))
    await expect(page.getByRole("main")).toBeVisible()
  }

  for (const content of [
    { body: promptFree.body, path: `/prompts/${promptFree.slug}` },
    {
      body: replicated.permanentFormation.body,
      path: `/formations/${replicated.permanentFormation.slug}`,
    },
    {
      body: participation.openJeu.body,
      path: `/jeux/${participation.openJeu.slug}`,
    },
    {
      body: freeOpportunity.body,
      path: `/opportunites/${freeOpportunity.slug}`,
    },
  ]) {
    await page.goto(content.path)
    await expect(page.getByText(content.body, { exact: true })).toBeVisible()
  }

  for (const path of [
    `/prompts/${promptPremium.slug}`,
    `/formations/${replicated.futureFormation.slug}`,
    `/jeux/${participation.premiumJeu.slug}`,
    `/opportunites/${replicated.premiumOpportunity.slug}`,
  ]) {
    await page.goto(path)
    await expect(
      page
        .getByRole("main")
        .locator(":scope > article")
        .getByRole("link", { name: /devenir membre|débloquer|premium/i }),
    ).toBeVisible()
  }

  await page.goto("/premium")
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /premium/i,
  )
  await registerParticipationMember(page)
  await expect(page).toHaveURL(/\/compte$/u)
  await expect(page.getByText(/FREE/i)).toBeVisible()
  expectRecipeEvidence([
    /parcours[\s\S]{0,80}visiteur anonyme[\s\S]{0,80}réussi/iu,
  ])
})

test(`Parcours v1 — le membre FREE lit le libre, reste verrouillé et retrouve son inscription — ce qui est vérifié
GIVEN : un membre FREE connecté, un prompt libre, quatre contenus PREMIUM et un concours gratuit ouvert
WHEN  : il lit le prompt, contrôle les quatre verrous, participe au concours puis ouvre son compte
THEN  : le contenu libre est complet, les quatre premium restent des teasers, l'inscription est confirmée et apparaît dans Mes participations avec une preuve publiée`, async ({
  page,
}) => {
  const email = await registerParticipationMember(page)
  const promptFree = await firstPrompt("FREE")
  const promptPremium = await firstPrompt("PREMIUM")
  const replicated = await insertReplicatedFixtures()
  const participation = await insertParticipationFixtures()

  await page.goto(`/prompts/${promptFree.slug}`)
  await expect(page.getByText(promptFree.body, { exact: true })).toBeVisible()
  for (const path of [
    `/prompts/${promptPremium.slug}`,
    `/formations/${replicated.futureFormation.slug}`,
    `/jeux/${participation.premiumJeu.slug}`,
    `/opportunites/${replicated.premiumOpportunity.slug}`,
  ]) {
    await page.goto(path)
    await expect(
      page.getByRole("link", { name: /devenir membre|débloquer|premium/i }),
    ).toBeVisible()
  }

  await page.goto(`/jeux/${participation.openJeu.slug}`)
  await page.getByRole("button", { name: /^je participe$/i }).click()
  await expect(page.getByText(/participation confirmée/i)).toBeVisible()
  await page.goto("/compte")
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText(participation.openJeu.title)).toBeVisible()
  expectRecipeEvidence([/parcours[\s\S]{0,80}membre FREE[\s\S]{0,80}réussi/iu])
})

test(`Parcours v1 — le membre PREMIUM accède à tout et participe à un concours premium — ce qui est vérifié
GIVEN : un compte promu PREMIUM en base, quatre contenus PREMIUM et un concours premium ouvert
WHEN  : il conserve sa session, ouvre chaque détail, participe au concours puis consulte son compte
THEN  : les quatre champs body et le lien externe sont accessibles, l'inscription premium est créée et la preuve du parcours est publiée`, async ({
  page,
}) => {
  const email = await registerParticipationMember(page)
  const prompt = await firstPrompt("PREMIUM")
  const replicated = await insertReplicatedFixtures()
  const participation = await insertParticipationFixtures()
  await participationDb.user.update({
    data: { membership: "PREMIUM" },
    where: { email },
  })

  for (const content of [
    { body: prompt.body, path: `/prompts/${prompt.slug}` },
    {
      body: replicated.futureFormation.body,
      path: `/formations/${replicated.futureFormation.slug}`,
    },
    {
      body: participation.premiumJeu.body,
      path: `/jeux/${participation.premiumJeu.slug}`,
    },
    {
      body: replicated.premiumOpportunity.body,
      path: `/opportunites/${replicated.premiumOpportunity.slug}`,
    },
  ]) {
    await page.goto(content.path)
    await expect(page.getByText(content.body, { exact: true })).toBeVisible()
  }
  await expect(
    page.locator(`a[href="${replicated.premiumOpportunity.externalUrl}"]`),
  ).toBeVisible()
  await page.goto(`/jeux/${participation.premiumJeu.slug}`)
  await page.getByRole("button", { name: /^je participe$/i }).click()
  await page.goto("/compte")
  await expect(page.getByText(participation.premiumJeu.title)).toBeVisible()
  expectRecipeEvidence([
    /parcours[\s\S]{0,80}membre PREMIUM[\s\S]{0,80}réussi/iu,
  ])
})
