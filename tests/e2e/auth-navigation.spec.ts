import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import { completeRegistration } from "./auth-profile-helpers"

test.use({ viewport: { width: 390, height: 844 } })

test(`La navigation rend l'état connecté ou déconnecté visible — ce qui est vérifié
GIVEN : un visiteur anonyme sur mobile puis le même visiteur après création de son compte
WHEN  : il consulte la navigation, s'inscrit puis se déconnecte depuis son compte
THEN  : Devenir membre est l'action principale anonyme et Connexion reste dans le menu, tandis que Compte et statut reflètent la session sans jamais placer Déconnexion dans le header`, async ({
  page,
}) => {
  const email = `navigation-${randomUUID()}@example.test`
  const password = "MotDePasse!2026"

  await page.goto("/")
  let anonymousNavigation = page.getByRole("navigation")
  await expect(
    anonymousNavigation.getByRole("link", { name: /devenir membre/i }),
  ).toHaveAttribute("href", /\/premium$/)
  const anonymousLogin = anonymousNavigation.locator('a[href="/login"]')
  await expect(anonymousLogin).toBeHidden()
  await anonymousNavigation
    .getByRole("button", { name: "Ouvrir le menu" })
    .click()
  await expect(anonymousLogin).toBeVisible()
  await expect(
    anonymousNavigation.getByRole("link", { name: /compte/i }),
  ).toHaveCount(0)

  await page.goto("/register")
  await completeRegistration(page, { email, password })
  await expect(page).toHaveURL(/\/compte$/)

  const memberNavigation = page.getByRole("navigation")
  await expect(
    memberNavigation.getByRole("link", { name: /compte/i }),
  ).toHaveAttribute("href", /\/compte$/)
  await expect(
    memberNavigation.getByRole("button", {
      name: /déconnexion|se déconnecter/i,
    }),
  ).toHaveCount(0)
  await expect(
    memberNavigation.getByRole("link", { name: /connexion|se connecter/i }),
  ).toHaveCount(0)

  await page.goto("/compte")
  await page
    .getByRole("main")
    .getByRole("button", { name: /déconnexion|se déconnecter/i })
    .click()
  anonymousNavigation = page.getByRole("navigation")
  await expect(
    anonymousNavigation.getByRole("link", { name: /devenir membre/i }),
  ).toHaveAttribute("href", /\/premium$/)
  await anonymousNavigation
    .getByRole("button", { name: "Ouvrir le menu" })
    .click()
  await expect(anonymousNavigation.locator('a[href="/login"]')).toBeVisible()
})
