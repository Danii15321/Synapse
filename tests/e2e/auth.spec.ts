import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

import {
  completeRegistration,
  fillRegistrationCredentialsStep,
  fillRegistrationProfileStep,
} from "./auth-profile-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

const db = new PrismaClient()

function findSessionCookie(
  cookies: Array<{
    httpOnly: boolean
    name: string
    sameSite: string
    secure: boolean
    value: string
  }>,
) {
  const cookie = cookies.find((candidate) =>
    candidate.name.includes("session-token"),
  )
  if (!cookie) {
    throw new Error("Auth.js doit créer un cookie session-token")
  }
  return cookie
}

async function expectNoHorizontalOverflow(page: {
  evaluate: <T>(callback: () => T) => Promise<T>
}): Promise<void> {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflows).toBe(false)
}

test.afterAll(async () => {
  await db.$disconnect()
})

test(`Un visiteur s'inscrit, voit son compte FREE, se déconnecte puis se reconnecte — ce qui est vérifié
GIVEN : une adresse unique, PostgreSQL migré et un navigateur mobile de 390px sans session
WHEN  : le visiteur s'inscrit, consulte /compte, fait évoluer la session database, se déconnecte puis se reconnecte
THEN  : il est connecté immédiatement, le cookie est httpOnly Secure SameSite=Lax, la session glisse sur 30 jours, membership suit la base sans reconnexion, le HTML ne fuit aucun secret et /compte refuse l'anonyme`, async ({
  browser,
  page,
}) => {
  const email = `e2e-${randomUUID()}@example.test`
  const password = "MotDePasse!2026"

  await page.goto("/register")
  await expectNoHorizontalOverflow(page)
  await completeRegistration(page, { email, password })
  await expect(page).toHaveURL(/\/compte$/)
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText(/FREE/i)).toBeVisible()
  await expectNoHorizontalOverflow(page)

  const cookie = findSessionCookie(await page.context().cookies())
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.secure).toBe(true)
  expect(cookie.sameSite).toBe("Lax")

  const sessions = await db.$queryRaw<
    Array<{ expires: Date; membership: string; userId: string }>
  >`
    SELECT s."expires", u."membership"::text, u."id" AS "userId"
    FROM "Session" s
    JOIN "User" u ON u."id" = s."userId"
    WHERE s."sessionToken" = ${cookie.value}
  `
  expect(sessions).toHaveLength(1)
  const initial = sessions[0]
  if (!initial) {
    throw new Error("la session database doit exister")
  }
  const days = (initial.expires.getTime() - Date.now()) / 86_400_000
  expect(days).toBeGreaterThan(29)
  expect(days).toBeLessThanOrEqual(30.1)
  expect(initial.membership).toBe("FREE")

  await db.$executeRaw`
    UPDATE "Session"
    SET "expires" = NOW() + INTERVAL '1 minute'
    WHERE "sessionToken" = ${cookie.value}
  `
  await page.reload()
  const renewed = await db.$queryRaw<Array<{ expires: Date }>>`
    SELECT "expires" FROM "Session" WHERE "sessionToken" = ${cookie.value}
  `
  const renewedDays =
    ((renewed[0]?.expires.getTime() ?? 0) - Date.now()) / 86_400_000
  expect(renewedDays).toBeGreaterThan(29)

  await db.$executeRaw`
    UPDATE "User" SET "membership" = 'PREMIUM' WHERE "id" = ${initial.userId}
  `
  await page.reload()
  await expect(page.getByText(/PREMIUM/i)).toBeVisible()
  const rawAccountResponse = await page.request.get("/compte")
  const rawAccountHtml = await rawAccountResponse.text()
  expect(rawAccountResponse.status()).toBe(200)
  expect(rawAccountHtml).not.toContain(password)
  expect(rawAccountHtml).not.toMatch(/passwordHash|sessionToken/i)

  await page
    .getByRole("button", { name: /déconnexion|se déconnecter/i })
    .click()
  await page.goto("/login")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(password)
  await page.getByRole("button", { name: /connexion|se connecter/i }).click()
  await expect(page).toHaveURL(/\/compte$/)

  const anonymous = await browser.newContext()
  const anonymousPage = await anonymous.newPage()
  await anonymousPage.goto("/compte")
  await expect(anonymousPage).toHaveURL(/\/login(?:\?|$)/)
  await anonymous.close()
})

test(`Changer son mot de passe fait tourner la session courante et invalide les autres — ce qui est vérifié
GIVEN : un compte connecté simultanément dans deux navigateurs mobiles avec deux sessions database distinctes
WHEN  : le premier navigateur change son mot de passe avec l'ancien secret correct
THEN  : son token tourne, le second navigateur perd l'accès, l'ancien secret échoue avec le même message qu'une adresse inconnue et le nouveau secret reconnecte le membre`, async ({
  browser,
  page,
}) => {
  const email = `password-${randomUUID()}@example.test`
  const oldPassword = "AncienSecret!2026"
  const newPassword = "NouveauSecret!2026"

  await page.goto("/register")
  await completeRegistration(page, { email, password: oldPassword })
  await expect(page).toHaveURL(/\/compte$/)

  const secondContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  })
  const secondPage = await secondContext.newPage()
  await secondPage.goto("/login")
  await secondPage.getByLabel(/e-mail|email/i).fill(email)
  await secondPage.getByLabel(/mot de passe/i).fill(oldPassword)
  await secondPage
    .getByRole("button", { name: /connexion|se connecter/i })
    .click()
  await expect(secondPage).toHaveURL(/\/compte$/)

  const before = findSessionCookie(await page.context().cookies()).value
  const secondToken = findSessionCookie(await secondContext.cookies()).value
  expect(secondToken).not.toBe(before)

  await page.getByRole("button", { name: /changer.*mot de passe/i }).click()
  await page.getByLabel(/ancien mot de passe/i).fill(oldPassword)
  await page.getByLabel(/nouveau mot de passe/i).fill(newPassword)
  await page.getByRole("button", { name: /changer|modifier/i }).click()
  await expect(page.getByText(/mot de passe.*modifié|succès/i)).toBeVisible()

  const after = findSessionCookie(await page.context().cookies()).value
  expect(after).not.toBe(before)
  const sessionRows = await db.$queryRaw<Array<{ sessionToken: string }>>`
    SELECT s."sessionToken"
    FROM "Session" s
    JOIN "User" u ON u."id" = s."userId"
    WHERE u."email" = ${email}
  `
  expect(sessionRows.map((row) => row.sessionToken)).toEqual([after])

  await secondPage.goto("/compte")
  await expect(secondPage).toHaveURL(/\/login(?:\?|$)/)
  await secondContext.close()

  await page
    .getByRole("button", { name: /déconnexion|se déconnecter/i })
    .click()
  await page.goto("/login")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(oldPassword)
  const knownResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  )
  await page.getByRole("button", { name: /connexion|se connecter/i }).click()
  const knownResponse = await knownResponsePromise
  const knownRaw = await knownResponse.text()
  const knownError = await page.getByRole("alert").textContent()

  await page
    .getByLabel(/e-mail|email/i)
    .fill(`unknown-${randomUUID()}@example.test`)
  await page.getByLabel(/mot de passe/i).fill(oldPassword)
  const unknownResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"),
  )
  await page.getByRole("button", { name: /connexion|se connecter/i }).click()
  const unknownResponse = await unknownResponsePromise
  const unknownRaw = await unknownResponse.text()
  const unknownError = await page.getByRole("alert").textContent()
  expect(unknownResponse.status()).toBe(knownResponse.status())
  expect(unknownResponse.headers()["content-type"]).toBe(
    knownResponse.headers()["content-type"],
  )
  expect(unknownRaw).toBe(knownRaw)
  expect(knownError).toBe(unknownError)

  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/mot de passe/i).fill(newPassword)
  await page.getByRole("button", { name: /connexion|se connecter/i }).click()
  await expect(page).toHaveURL(/\/compte$/)
})

test(`Les formulaires rendent les états vide, loading, error et success sans double soumission — ce qui est vérifié
GIVEN : la page d'inscription mobile vide et une réponse serveur contrôlée qui reste en attente puis échoue
WHEN  : le visiteur soumet une inscription valide et tente de cliquer une seconde fois
THEN  : le bouton devient désactivé pendant loading, une seule requête part, l'erreur accessible apparaît, le bouton redevient actif et une soumission réussie redirige vers le compte`, async ({
  page,
}) => {
  let calls = 0
  await page.route("**/api/auth/register", async (route) => {
    calls += 1
    await new Promise((resolve) => setTimeout(resolve, 300))
    await route.fulfill({
      body: JSON.stringify({ message: "Inscription impossible" }),
      contentType: "application/json",
      status: 500,
    })
  })
  await page.goto("/register")
  await expect(page.getByLabel(/e-mail|email/i)).toHaveValue("")
  await fillRegistrationCredentialsStep(page, {
    email: "loading@example.test",
    password: "MotDePasse!2026",
  })
  await fillRegistrationProfileStep(page)
  const button = page.locator('form button[type="submit"]')

  await button.click()
  await expect(button).toBeDisabled()
  await button.click({ force: true })
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(button).toBeEnabled()
  expect(calls).toBe(1)

  await page.unroute("**/api/auth/register")
  await button.click()
  await expect(page).toHaveURL(/\/compte$/)
})
