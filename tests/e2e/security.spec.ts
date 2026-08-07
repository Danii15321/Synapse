import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function extractNonce(csp: string): string {
  const nonce = csp.match(/(?:^|;)\s*script-src[^;]*'nonce-([^']+)'/)?.[1]
  if (!nonce) {
    throw new Error("la directive script-src doit contenir un nonce")
  }
  return nonce
}

function scriptTags(html: string): string[] {
  return html.match(/<script\b[^>]*>/gi) ?? []
}

async function clearRateLimitState(): Promise<void> {
  const client = new PrismaClient()
  try {
    if (!isRecord(client)) {
      return
    }
    const delegate = Object.entries(client).find(
      ([name, value]) =>
        /rate.*limit|limit.*rate/i.test(name) && isRecord(value),
    )?.[1]
    if (!isRecord(delegate) || typeof delegate.deleteMany !== "function") {
      return
    }
    await Reflect.apply(delegate.deleteMany, delegate, [{}])
  } finally {
    await client.$disconnect()
  }
}

test(`Le socle de sécurité protège /prompts jusque dans la réponse HTTP brute — ce qui est vérifié
GIVEN : PostgreSQL migré, le compteur de rate limiting vide, un navigateur mobile de 390px et des valeurs X-Forwarded-For falsifiées
WHEN  : le visiteur charge deux fois /prompts puis envoie rapidement 70 GET vers /api/prompts avec un faux X-Forwarded-For différent à chaque appel
THEN  : chaque header de sécurité est présent, les nonces CSP diffèrent et autorisent l'hydratation sans unsafe-inline ni unsafe-eval, puis la même IP de connexion reçoit des 429 avec Retry-After et un JSON générique errorId sans fuite`, async ({
  page,
  request,
}) => {
  await clearRateLimitState()
  const browserErrors: string[] = []
  page.on("pageerror", (error) => browserErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text())
    }
  })

  const firstResponse = await page.goto("/prompts")
  if (!firstResponse) {
    throw new Error("la navigation vers /prompts doit produire une réponse")
  }
  const firstHeaders = firstResponse.headers()
  const firstHtml = await firstResponse.text()

  expect(firstResponse.status()).toBe(200)
  expect(firstHeaders["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains; preload",
  )
  expect(firstHeaders["x-content-type-options"]).toBe("nosniff")
  expect(firstHeaders["x-frame-options"]).toBe("DENY")
  expect(firstHeaders["referrer-policy"]).toBe(
    "strict-origin-when-cross-origin",
  )
  expect(firstHeaders["permissions-policy"]).toBe(
    "geolocation=(), camera=(), microphone=()",
  )
  const firstCsp = firstHeaders["content-security-policy"] ?? ""
  expect(firstCsp).not.toContain("'unsafe-inline'")
  expect(firstCsp).not.toContain("'unsafe-eval'")
  const firstNonce = extractNonce(firstCsp)
  const firstScripts = scriptTags(firstHtml)
  expect(firstScripts.length).toBeGreaterThan(0)
  for (const script of firstScripts) {
    expect(script).toContain(`nonce="${firstNonce}"`)
  }
  await expect(page.getByRole("main")).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
  expect(browserErrors).toEqual([])

  const secondResponse = await request.get("/prompts")
  const secondHeaders = secondResponse.headers()
  const secondHtml = await secondResponse.text()
  const secondCsp = secondHeaders["content-security-policy"] ?? ""
  const secondNonce = extractNonce(secondCsp)
  expect(secondResponse.status()).toBe(200)
  expect(secondNonce).not.toBe(firstNonce)
  for (const script of scriptTags(secondHtml)) {
    expect(script).toContain(`nonce="${secondNonce}"`)
  }

  const responses = []
  for (let requestNumber = 1; requestNumber <= 70; requestNumber += 1) {
    responses.push(
      await request.get("/api/prompts", {
        headers: {
          "x-forwarded-for": `203.0.113.${requestNumber}`,
        },
      }),
    )
  }
  const statuses = responses.map((response) => response.status())
  expect(statuses.every((status) => status === 200 || status === 429)).toBe(
    true,
  )
  expect(
    statuses.filter((status) => status === 429).length,
  ).toBeGreaterThanOrEqual(10)
  const firstLimitedIndex = statuses.indexOf(429)
  expect(firstLimitedIndex).toBeGreaterThanOrEqual(0)
  expect(
    statuses.slice(firstLimitedIndex).every((status) => status === 429),
  ).toBe(true)

  const limitedResponses = responses.filter(
    (response) => response.status() === 429,
  )
  for (const response of limitedResponses) {
    const retryAfter = Number(response.headers()["retry-after"])
    expect(Number.isInteger(retryAfter)).toBe(true)
    expect(retryAfter).toBeGreaterThan(0)
  }
  const firstLimitedResponse = limitedResponses[0]
  if (!firstLimitedResponse) {
    throw new Error("au moins une requête doit être limitée")
  }
  const rawError = await firstLimitedResponse.text()
  const payload: unknown = JSON.parse(rawError)
  expect(isRecord(payload)).toBe(true)
  if (!isRecord(payload)) {
    throw new Error("la réponse 429 doit être un objet JSON")
  }
  expect(Object.keys(payload).sort()).toEqual(["errorId", "message"])
  expect(payload.message).toEqual(expect.any(String))
  expect(payload.errorId).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  )
  expect(rawError).not.toMatch(
    /Prisma|stack|DATABASE_URL|postgresql:\/\/|PromptSecret/i,
  )
})
