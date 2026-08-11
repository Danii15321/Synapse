import { createHash, randomUUID } from "node:crypto"
import { spawnSync } from "node:child_process"

import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

const db = new PrismaClient()

type PremiumPrompt = Readonly<{
  body: string
  excerpt: string
  slug: string
  title: string
}>

async function premiumPrompt(): Promise<PremiumPrompt> {
  const rows = await db.$queryRaw<PremiumPrompt[]>`
    SELECT "body", "excerpt", "slug", "title"
    FROM "Prompt"
    WHERE "visibility" = 'PREMIUM'::"Visibility"
    ORDER BY "slug"
    LIMIT 1
  `
  const prompt = rows[0]
  if (!prompt) {
    throw new Error("le seed doit fournir au moins un prompt PREMIUM")
  }
  return prompt
}

function sessionToken(
  cookies: Array<Readonly<{ name: string; value: string }>>,
): string {
  const cookie = cookies.find((candidate) =>
    candidate.name.includes("session-token"),
  )
  if (!cookie) {
    throw new Error("une session database Auth.js est attendue")
  }
  return cookie.value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonRecord(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function visiblePromptBody(body: string): string {
  const lines = body.split(/\r?\n/u)
  const hasMarkdownHeading = lines.some((line) =>
    /^(#{1,3})\s+(.+)$/u.test(line.trim()),
  )
  if (!hasMarkdownHeading) return body

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:#{1,3})\s+/u, ""))
    .map((line) =>
      line.replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1"),
    )
    .join("\n")
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

async function registerFreeMember(
  page: {
    getByLabel: (name: RegExp) => { fill: (value: string) => Promise<void> }
    getByRole: (
      role: "button",
      options: { name: RegExp },
    ) => { click: () => Promise<void> }
    goto: (url: string) => Promise<unknown>
    waitForURL: (url: RegExp) => Promise<void>
  },
  email: string,
): Promise<void> {
  await page.goto("/register")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill("MotDePasse!2026")
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await page.waitForURL(/\/compte$/)
}

test.afterAll(async () => {
  await db.$disconnect()
})

test(`Un anonyme voit un extrait convaincant mais aucun octet du corps premium — ce qui est vérifié
GIVEN : un prompt PREMIUM enrichi d'un excerpt distinct, aucun cookie et un viewport mobile de 390px
WHEN  : le visiteur lit l'API brute, le HTML brut puis ouvre le détail et active le bloc verrouillé
THEN  : body est absent de l'API et du payload RSC, l'extrait reste lisible, le faux aperçu est flouté et décoratif, toute la cible mesure au moins 44px et mène à /register`, async ({
  page,
}) => {
  const prompt = await premiumPrompt()

  const apiResponse = await page.request.get(`/api/prompts/${prompt.slug}`)
  const rawJson = await apiResponse.text()
  const htmlResponse = await page.request.get(`/prompts/${prompt.slug}`)
  const rawHtml = await htmlResponse.text()

  expect(apiResponse.status()).toBe(200)
  expect(rawJson).toContain(prompt.excerpt)
  expect(rawJson).not.toMatch(/"body"/)
  expect(rawJson).not.toContain(prompt.body)
  expect(htmlResponse.status()).toBe(200)
  expect(rawHtml).toContain(prompt.excerpt)
  expect(rawHtml).not.toContain(prompt.body)
  expect(rawHtml).not.toContain(JSON.stringify(prompt.body).slice(1, -1))

  await page.goto(`/prompts/${prompt.slug}`)
  await expect(
    page.getByRole("heading", { name: prompt.title, exact: true }),
  ).toBeVisible()
  await expect(page.getByText(prompt.excerpt, { exact: true })).toBeVisible()
  const gate = page
    .getByRole("main")
    .getByRole("link", {
      name: /devenir membre|débloquer|accéder.*contenu/i,
    })
  await expect(gate).toHaveAttribute("href", "/register")
  const box = await gate.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
  const blurred = gate.locator('[aria-hidden="true"]')
  await expect(blurred).toHaveCount(1)
  await expect(blurred).toHaveClass(/blur/)
  await gate.click()
  await expect(page).toHaveURL(/\/register$/)
})

test(`Un membre FREE connecté ne reçoit jamais le corps premium — ce qui est vérifié
GIVEN : un compte FREE avec une session database active et un prompt PREMIUM
WHEN  : le membre demande directement l'API puis le HTML du détail
THEN  : les deux réponses restent des teasers, body et sa valeur sont absents des octets servis et le cadenas demeure visible`, async ({
  page,
}) => {
  const prompt = await premiumPrompt()
  const email = `premium-free-${randomUUID()}@example.test`
  await registerFreeMember(page, email)

  const apiResponse = await page.request.get(`/api/prompts/${prompt.slug}`)
  const rawJson = await apiResponse.text()
  const htmlResponse = await page.request.get(`/prompts/${prompt.slug}`)
  const rawHtml = await htmlResponse.text()

  expect(apiResponse.status()).toBe(200)
  expect(rawJson).not.toMatch(/"body"/)
  expect(rawJson).not.toContain(prompt.body)
  expect(htmlResponse.status()).toBe(200)
  expect(rawHtml).not.toContain(prompt.body)
  expect(rawHtml).not.toContain(JSON.stringify(prompt.body).slice(1, -1))

  await page.goto(`/prompts/${prompt.slug}`)
  await expect(
    page.getByRole("link", {
      name: /devenir membre|débloquer|accéder.*contenu/i,
    }),
  ).toBeVisible()
})

test(`La promotion CLI ouvre le corps sans reconnexion et sans contaminer le cache anonyme — ce qui est vérifié
GIVEN : un membre FREE connecté, un prompt PREMIUM et la même session database conservée
WHEN  : npm run grant-premium promeut explicitement son e-mail, la page est rechargée puis un nouvel anonyme demande le même contenu après lui
THEN  : la commande réussit et trace l'opération, le token ne change pas, le membre voit body immédiatement, tandis que l'anonyme suivant ne reçoit toujours body ni dans l'API ni dans le HTML`, async ({
  browser,
  page,
}) => {
  const prompt = await premiumPrompt()
  const email = `premium-grant-${randomUUID()}@example.test`
  await registerFreeMember(page, email)
  await page.goto(`/prompts/${prompt.slug}`)
  await expect(page.getByText(prompt.body, { exact: true })).toHaveCount(0)
  const tokenBefore = sessionToken(await page.context().cookies())

  const promotion = spawnSync("npm", ["run", "grant-premium", "--", email], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  })
  const trace = `${promotion.stdout}\n${promotion.stderr}`

  expect(promotion.status, trace).toBe(0)
  const structuredTrace = trace
    .split(/\r?\n/)
    .map(parseJsonRecord)
    .find((record) => {
      const serialized = JSON.stringify(record)
      return (
        serialized.includes(email) &&
        /premium|membership|promotion/i.test(serialized)
      )
    })
  expect(structuredTrace).toBeDefined()

  await page.reload()
  expect(sessionToken(await page.context().cookies())).toBe(tokenBefore)
  const promptBody = page.locator(".prompt-body-text")
  await expect(promptBody).toBeVisible()
  expect(
    sha256(await promptBody.innerText()),
    "le corps premium rendu doit correspondre intégralement à la ressource",
  ).toBe(sha256(visiblePromptBody(prompt.body)))
  const entitledResponse = await page.request.get(`/api/prompts/${prompt.slug}`)
  const entitledRaw = await entitledResponse.text()
  const entitledPayload = parseJsonRecord(entitledRaw)
  expect(entitledResponse.status()).toBe(200)
  expect(entitledPayload?.body).toBe(prompt.body)

  const anonymousContext = await browser.newContext({
    viewport: { height: 844, width: 390 },
  })
  const anonymousPage = await anonymousContext.newPage()
  const anonymousApi = await anonymousPage.request.get(
    `/api/prompts/${prompt.slug}`,
  )
  const anonymousRawJson = await anonymousApi.text()
  const anonymousHtml = await anonymousPage.request.get(
    `/prompts/${prompt.slug}`,
  )
  const anonymousRawHtml = await anonymousHtml.text()

  expect(anonymousApi.status()).toBe(200)
  expect(anonymousRawJson).not.toMatch(/"body"/)
  expect(anonymousRawJson).not.toContain(prompt.body)
  expect(anonymousHtml.status()).toBe(200)
  expect(anonymousRawHtml).not.toContain(prompt.body)
  expect(anonymousRawHtml).not.toContain(
    JSON.stringify(prompt.body).slice(1, -1),
  )
  await anonymousContext.close()
})
