import { expect, type Page } from "@playwright/test"

export const REGISTRATION_PROFILE = {
  city: "Abidjan",
  country: "Côte d'Ivoire",
  firstName: "Awa",
  lastName: "Kouassi",
  phone: "+2250701020304",
  professionalLevel: "ETUDIANT",
} as const

export async function fillRegistrationCredentialsStep(
  page: Page,
  credentials: Readonly<{ email: string; password: string }>,
): Promise<void> {
  await page.getByLabel(/e-mail|email/i).fill(credentials.email)
  await page.getByLabel(/^mot de passe/i).fill(credentials.password)
  await page.locator('form button[type="submit"]').click()
  await expect(page.getByLabel(/^prénom$/i)).toBeVisible()
}

export async function fillRegistrationProfileStep(page: Page): Promise<void> {
  await page.getByLabel(/^prénom$/i).fill(REGISTRATION_PROFILE.firstName)
  await page.getByLabel(/^nom$/i).fill(REGISTRATION_PROFILE.lastName)
  await page.getByLabel(/téléphone/i).fill(REGISTRATION_PROFILE.phone)
  await page.getByLabel(/^ville$/i).fill(REGISTRATION_PROFILE.city)
  await page.getByLabel(/^pays$/i).fill(REGISTRATION_PROFILE.country)

  const levelSelect = page.getByRole("combobox", {
    name: /niveau professionnel/i,
  })
  if ((await levelSelect.count()) > 0) {
    await levelSelect.selectOption(REGISTRATION_PROFILE.professionalLevel)
  } else {
    await page.getByRole("radio", { name: "Étudiant", exact: true }).check()
  }
}

export async function completeRegistration(
  page: Page,
  credentials: Readonly<{ email: string; password: string }>,
): Promise<void> {
  await fillRegistrationCredentialsStep(page, credentials)
  await fillRegistrationProfileStep(page)
  await page.locator('form button[type="submit"]').click()
}
