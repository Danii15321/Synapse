import { randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

test(`La navigation rend l'état connecté ou déconnecté visible — ce qui est vérifié
GIVEN : un visiteur anonyme sur mobile puis le même visiteur après création de son compte
WHEN  : il consulte la navigation, s'inscrit et se déconnecte
THEN  : le lien Connexion est visible seulement sans session, tandis que le lien Compte et l'action Déconnexion sont visibles seulement avec une session`, async ({
  page,
}) => {
  const email = `navigation-${randomUUID()}@example.test`
  const password = "MotDePasse!2026"

  await page.goto("/")
  const anonymousNavigation = page.getByRole("navigation")
  await expect(
    anonymousNavigation.getByRole("link", { name: /connexion|se connecter/i }),
  ).toHaveAttribute("href", /\/login$/)
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
  await expect(
    page
      .getByRole("navigation")
      .getByRole("link", { name: /connexion|se connecter/i }),
  ).toBeVisible()
})
