import { expect, test } from "@playwright/test"

import {
  cleanupReplicatedFixtures,
  insertReplicatedFixtures,
  registerReplicatedMember,
  replicatedDb,
} from "./formations-opportunites-helpers"
import {
  cleanupParticipationFixtures,
  insertParticipationFixtures,
  participationDb,
} from "./jeux-participations-helpers"
import { firstPrompt } from "./prompt-reference-helpers"
import { expectRecipeEvidence } from "./recette-v1-proof"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

test.afterEach(async () => {
  await cleanupParticipationFixtures()
  await cleanupReplicatedFixtures()
})

test.afterAll(async () => {
  await participationDb.$disconnect()
  await replicatedDb.$disconnect()
})

test(`Audit d'entitlement v1 — les quatre rubriques excluent tous les champs verrouillés de chaque transport — ce qui est vérifié
GIVEN : body sur Prompts, Formations et Jeux, body plus externalUrl sur Opportunités, puis un anonyme et un membre FREE
WHEN  : chacun télécharge directement le JSON, le HTML et le flux RSC de chaque contenu PREMIUM
THEN  : aucun champ ni aucune valeur verrouillée ne figure dans les octets servis et le tableau exhaustif de recette consigne les 24 contrôles`, async ({
  browser,
  page,
}) => {
  const prompt = await firstPrompt("PREMIUM")
  const replicated = await insertReplicatedFixtures()
  const participation = await insertParticipationFixtures()
  const resources = [
    {
      api: `/api/prompts/${prompt.slug}`,
      locked: [prompt.body],
      page: `/prompts/${prompt.slug}`,
    },
    {
      api: `/api/formations/${replicated.futureFormation.slug}`,
      locked: [replicated.futureFormation.body],
      page: `/formations/${replicated.futureFormation.slug}`,
    },
    {
      api: `/api/jeux/${participation.premiumJeu.slug}`,
      locked: [participation.premiumJeu.body],
      page: `/jeux/${participation.premiumJeu.slug}`,
    },
    {
      api: `/api/opportunites/${replicated.premiumOpportunity.slug}`,
      locked: [
        replicated.premiumOpportunity.body,
        replicated.premiumOpportunity.externalUrl,
      ],
      page: `/opportunites/${replicated.premiumOpportunity.slug}`,
    },
  ]

  for (const actor of ["anonyme", "FREE"] as const) {
    const context =
      actor === "anonyme"
        ? await browser.newContext({ baseURL: "http://localhost:3000" })
        : page.context()
    const actorPage = actor === "anonyme" ? await context.newPage() : page
    if (actor === "FREE") await registerReplicatedMember(actorPage)

    for (const resource of resources) {
      const responses = [
        await actorPage.request.get(resource.api),
        await actorPage.request.get(resource.page),
        await actorPage.request.get(resource.page, { headers: { RSC: "1" } }),
      ]
      for (const response of responses) {
        expect(response.status()).toBe(200)
        const raw = await response.text()
        expect(raw).not.toMatch(/"body"\s*:|"externalUrl"\s*:/u)
        for (const lockedValue of resource.locked) {
          expect(raw).not.toContain(lockedValue)
          expect(raw).not.toContain(JSON.stringify(lockedValue).slice(1, -1))
        }
      }
    }
    if (actor === "anonyme") await context.close()
  }
  expectRecipeEvidence([
    /tableau d['’]audit d['’]entitlement/iu,
    /24 contrôles[\s\S]{0,60}(?:réussis|validés)/iu,
  ])
})

test(`Écart E12-01 — les cinq pages institutionnelles ne publient aucun fait juridique ni canal inventé — ce qui est vérifié
GIVEN : uniquement les faits du README, le comportement réel v1 et aucune identité juridique ni coordonnée publique fournie
WHEN  : un visiteur télécharge le HTML brut des cinq pages institutionnelles
THEN  : les cinq répondent 200 avec un texte substantiel, aucun placeholder ni champ juridique à remplir et le numéro du tunnel +33 6 68 82 30 12 n'apparaît jamais`, async ({
  request,
}) => {
  const pages = [
    ["/a-propos", /jeunes ivoiriens/iu],
    ["/contact", /aucun canal[\s\S]{0,80}public[\s\S]{0,80}validé/iu],
    ["/mentions-legales", /Synapse/iu],
    ["/confidentialite", /adresse e-mail|mot de passe/iu],
    ["/conditions-utilisation", /gratuit|premium/iu],
  ] as const
  for (const [path, verifiedFact] of pages) {
    const response = await request.get(path)
    const html = await response.text()
    expect(response.status()).toBe(200)
    expect(html).toMatch(verifiedFact)
    expect(html).not.toMatch(
      /À compléter|gabarit juridique|raison sociale|adresse postale|responsable de publication|juridiction|droit applicable/iu,
    )
    expect(html).not.toMatch(
      /\+33(?:\s|%20)*6(?:\s|%20)*68(?:\s|%20)*82(?:\s|%20)*30(?:\s|%20)*12/iu,
    )
  }
})

test(`Le site entier — robots, sitemap, 404 et aperçus de partage restent publics sans fuite — ce qui est vérifié
GIVEN : un contenu PREMIUM de chaque rubrique, une opportunité expirée et les routes membre
WHEN  : robots.txt, sitemap.xml, un slug absent et les quatre HTML partageables sont téléchargés
THEN  : SEO répond 200 sans member, brouillon ni expiré, le slug vaut 404 et chaque Open Graph nomme le contenu sans exposer son corps premium`, async ({
  request,
}) => {
  const prompt = await firstPrompt("PREMIUM")
  const replicated = await insertReplicatedFixtures()
  const participation = await insertParticipationFixtures()
  const robots = await request.get("/robots.txt")
  const sitemap = await request.get("/sitemap.xml")
  const robotsText = await robots.text()
  const sitemapText = await sitemap.text()

  expect(robots.status()).toBe(200)
  expect(sitemap.status()).toBe(200)
  expect(robotsText).toMatch(/sitemap/iu)
  expect(sitemapText).not.toMatch(/\/(?:compte|login|register|api)(?:\/|<)/u)
  expect(sitemapText).not.toContain(replicated.expiredOpportunity.slug)
  const missing = await request.get("/prompts/slug-totalement-inexistant")
  expect(missing.status()).toBe(404)

  for (const content of [
    { body: prompt.body, path: `/prompts/${prompt.slug}`, title: prompt.title },
    {
      body: replicated.futureFormation.body,
      path: `/formations/${replicated.futureFormation.slug}`,
      title: replicated.futureFormation.title,
    },
    {
      body: participation.premiumJeu.body,
      path: `/jeux/${participation.premiumJeu.slug}`,
      title: participation.premiumJeu.title,
    },
    {
      body: replicated.premiumOpportunity.body,
      path: `/opportunites/${replicated.premiumOpportunity.slug}`,
      title: replicated.premiumOpportunity.title,
    },
  ]) {
    const response = await request.get(content.path)
    const html = await response.text()
    expect(response.status()).toBe(200)
    expect(html).toMatch(/property="og:title"/u)
    expect(html).toMatch(/property="og:description"/u)
    expect(html).toMatch(/property="og:image"/u)
    expect(html).toContain(content.title)
    expect(html).not.toContain(content.body)
  }
  expectRecipeEvidence([/vrai fil WhatsApp|fil WhatsApp réel/iu])
})
