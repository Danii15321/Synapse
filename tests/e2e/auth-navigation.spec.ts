import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

test(`La navigation rend l'état connecté ou déconnecté visible — ce qui est vérifié
GIVEN : un visiteur anonyme sur mobile puis le même visiteur après création de son compte
WHEN  : il consulte la navigation, s'inscrit et se déconnecte
THEN  : Devenir membre est l'action principale anonyme et Connexion reste dans le menu, tandis que Compte, statut et Déconnexion sont visibles seulement avec une session`, async ({
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
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill(password)
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await expect(page).toHaveURL(/\/compte$/)

  const memberNavigation = page.getByRole("navigation")
  await expect(
    memberNavigation.getByRole("link", { name: /compte/i }),
  ).toHaveAttribute("href", /\/compte$/)
  await expect(
    memberNavigation.getByRole("button", {
      name: /déconnexion|se déconnecter/i,
    }),
  ).toBeVisible()
  await expect(
    memberNavigation.getByRole("link", { name: /connexion|se connecter/i }),
  ).toHaveCount(0)

  await memberNavigation
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
