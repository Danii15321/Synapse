import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import { expect, test } from "@playwright/test"

import {
  completeRegistration,
  fillRegistrationCredentialsStep,
  fillRegistrationProfileStep,
  REGISTRATION_PROFILE,
} from "./auth-profile-helpers"

test.use({ viewport: { height: 844, width: 390 } })
test.describe.configure({ mode: "default" })

const db = new PrismaClient()
const createdUserIds = new Set<string>()

async function userIdFor(email: string): Promise<string> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "User" WHERE "email" = ${email}
  `
  const id = rows[0]?.id
  if (!id) throw new Error(`le compte ${email} doit exister`)
  createdUserIds.add(id)
  return id
}

test.beforeEach(async () => {
  await db.rateLimit.deleteMany()
})

test.afterEach(async () => {
  if (createdUserIds.size > 0) {
    await db.user.deleteMany({
      where: { id: { in: Array.from(createdUserIds) } },
    })
    createdUserIds.clear()
  }
})

test.afterAll(async () => db.$disconnect())

test(`L'inscription en deux étapes crée le profil seulement à la fin puis le membre peut l'éditer — ce qui est vérifié
GIVEN : une adresse unique, PostgreSQL migré et un visiteur mobile 390px sans session
WHEN  : il valide l'étape e-mail/mot de passe, complète les six informations, ouvre Mon profil, modifie son e-mail puis se déconnecte et se reconnecte
THEN  : aucune ligne n'existe après l'étape 1, la création finale persiste le profil FREE complet, l'e-mail est normalisé, Mon profil reste séparé de Confidentialité, le CTA membre est accessible sans logout dans le header ni overflow`, async ({
  page,
}) => {
  const initialEmail = `profile-${randomUUID()}@example.test`
  const updatedEmail = `updated-${randomUUID()}@example.test`
  const password = "MotDePasse!2026"
  await page.goto("/register")

  await fillRegistrationCredentialsStep(page, {
    email: initialEmail,
    password,
  })
  expect(await db.user.count({ where: { email: initialEmail } })).toBe(0)
  await fillRegistrationProfileStep(page)
  await page.locator('form button[type="submit"]').click()
  await expect(page).toHaveURL(/\/compte$/u)

  const userId = await userIdFor(initialEmail)
  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    SELECT "name", "email", "firstName", "lastName", "phone", "city",
           "country", "professionalLevel"::text AS "professionalLevel",
           "membership"::text AS membership
    FROM "User" WHERE "id" = ${userId}
  `
  expect(rows).toEqual([
    {
      ...REGISTRATION_PROFILE,
      email: initialEmail,
      membership: "FREE",
      name: expect.stringMatching(/Awa.*Kouassi|Kouassi.*Awa/u),
    },
  ])

  const main = page.getByRole("main")
  await expect(main.getByRole("heading", { name: "Mon profil" })).toBeVisible()
  const accountNavigation = main.getByRole("navigation", { name: /compte/i })
  await expect(accountNavigation.getByRole("link")).toHaveText([
    "Mon profil",
    "Confidentialité",
  ])
  await expect(
    accountNavigation.getByRole("link", { name: "Mon profil" }),
  ).toHaveAttribute("aria-current", "page")
  await expect(
    accountNavigation.getByRole("link", { name: "Confidentialité" }),
  ).not.toHaveAttribute("aria-current")
  await expect(
    main.getByRole("heading", { name: "Confidentialité" }),
  ).toHaveCount(0)
  await expect(main.getByLabel(/ancien mot de passe/i)).toHaveCount(0)
  await expect(
    main.getByRole("heading", { name: /zone de danger/i }),
  ).toHaveCount(0)
  await expect(
    main.getByRole("link", { name: /devenir membre/i }),
  ).toHaveAttribute("href", "/premium")
  await expect(main.getByText(REGISTRATION_PROFILE.firstName)).toBeVisible()
  await expect(main.getByLabel(/^prénom$/i)).toHaveCount(0)
  await expect(
    page
      .getByRole("banner")
      .getByRole("button", { name: /déconnexion|se déconnecter/i }),
  ).toHaveCount(0)

  await main.getByRole("button", { name: "Modifier" }).click()
  await main
    .getByLabel(/e-mail|email/i)
    .fill(`  ${updatedEmail.toUpperCase()}  `)
  const editForm = main
    .getByLabel(/e-mail|email/i)
    .locator("xpath=ancestor::form")
  await editForm.locator('button[type="submit"]').click()
  await expect(main.getByText(updatedEmail, { exact: true })).toBeVisible()
  expect(await db.user.count({ where: { email: updatedEmail } })).toBe(1)

  const interactive = main.locator(
    "a:visible, button:visible, input:visible, select:visible",
  )
  for (const element of await interactive.all()) {
    const box = await element.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)

  const accountButtons = main.getByRole("button")
  const lastButton = accountButtons.nth((await accountButtons.count()) - 1)
  await expect(lastButton).toHaveAccessibleName(/déconnexion|se déconnecter/i)
  await lastButton.click()
  await page.goto("/login")
  await page.getByLabel(/e-mail|email/i).fill(updatedEmail)
  await page.getByLabel(/mot de passe/i).fill(password)
  await page.getByRole("button", { name: /connexion|se connecter/i }).click()
  await expect(page).toHaveURL(/\/compte$/u)
})

test(`La zone de danger refuse un mauvais secret puis supprime irréversiblement le compte — ce qui est vérifié
GIVEN : un membre connecté avec une seconde session database et son mot de passe actuel
WHEN  : il tente la suppression avec un mauvais secret puis recommence avec le bon
THEN  : il doit d'abord ouvrir la vue Confidentialité séparée, la première tentative reste générique et conserve le compte, la seconde redirige hors compte, supprime User et toutes ses sessions et expire le cookie navigateur`, async ({
  page,
}) => {
  const email = `delete-${randomUUID()}@example.test`
  const password = "MotDePasse!2026"
  await page.goto("/register")
  await completeRegistration(page, { email, password })
  await expect(page).toHaveURL(/\/compte$/u)
  const userId = await userIdFor(email)
  await db.session.create({
    data: {
      expires: new Date("2099-01-01T00:00:00.000Z"),
      sessionToken: `second-${randomUUID()}`,
      userId,
    },
  })

  const navigation = page
    .getByRole("main")
    .getByRole("navigation", { name: /compte/i })
  await navigation.getByRole("link", { name: "Confidentialité" }).click()
  await expect(page).toHaveURL(/\/compte\?section=confidentialite$/u)
  await expect(
    navigation.getByRole("link", { name: "Confidentialité" }),
  ).toHaveAttribute("aria-current", "page")
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Mon profil" }),
  ).toHaveCount(0)
  await expect(
    page
      .getByRole("main")
      .getByRole("button", { name: /déconnexion|se déconnecter/i }),
  ).toHaveCount(0)

  const dangerHeading = page.getByRole("heading", { name: /zone de danger/i })
  const danger = page.locator("section").filter({ has: dangerHeading })
  const passwordField = danger.getByLabel(/mot de passe.*actuel/i)
  const deleteButton = danger.getByRole("button", {
    name: /supprimer.*compte/i,
  })
  await passwordField.fill("MauvaisSecret!2026")
  await deleteButton.click()
  await expect(danger.getByRole("alert")).toBeVisible()
  expect(await db.user.count({ where: { id: userId } })).toBe(1)

  await passwordField.fill(password)
  await deleteButton.click()
  await expect(page).toHaveURL("/")
  createdUserIds.delete(userId)
  expect(await db.user.count({ where: { id: userId } })).toBe(0)
  expect(await db.session.count({ where: { userId } })).toBe(0)
  expect(
    (await page.context().cookies()).some((cookie) =>
      cookie.name.includes("session-token"),
    ),
  ).toBe(false)
})
