import { expect, test } from "@playwright/test"

import {
  cleanupPremiumTunnelMembers,
  premiumTunnelDb,
  registerFreePremiumMember,
} from "./premium-tunnel-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

const OFFER_TITLE = "Accès à vie Synapse Premium"
const PRICE_PATTERN = /7[\s\u00a0\u202f]*550\s*FCFA/iu

test.afterEach(cleanupPremiumTunnelMembers)
test.afterAll(async () => premiumTunnelDb.$disconnect())

test(`La proposition Premium s'empile sur mobile et forme deux colonnes sur desktop — ce qui est vérifié
GIVEN : l'offre publique chargée avec la charte Synapse sur des viewports de 390 puis 1280 pixels
WHEN  : les positions, tailles, couleurs, typographies, contrastes et cibles interactives sont mesurés
THEN  : le hero précède la carte tarifaire sur mobile sans overflow, la carte passe à droite sur desktop, le texte et le prix restent lisibles, les cibles font au moins 44 pixels et la charte Synapse conserve un contraste AA`, async ({
  page,
}) => {
  await page.goto("/premium")
  const main = page.getByRole("main")
  const title = main.getByRole("heading", { level: 1 })
  const hero = title.locator("..")
  const priceCard = main.locator("aside")
  const price = priceCard.getByText(PRICE_PATTERN).first()

  await expect(title).toBeVisible()
  await expect(priceCard).toBeVisible()
  await expect(price).toBeVisible()

  const mobileHeroBox = await hero.boundingBox()
  const mobileCardBox = await priceCard.boundingBox()
  expect(mobileHeroBox).not.toBeNull()
  expect(mobileCardBox).not.toBeNull()
  expect(mobileCardBox?.y ?? 0).toBeGreaterThan(
    (mobileHeroBox?.y ?? 0) + (mobileHeroBox?.height ?? 0),
  )

  const mobileTypography = await page.evaluate(() => {
    function rgb(value: string): [number, number, number] {
      const channels = value
        .match(/\d+(?:\.\d+)?/gu)
        ?.slice(0, 3)
        .map(Number)
      if (!channels || channels.length !== 3) {
        throw new Error("couleur RGB attendue")
      }
      return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0]
    }
    function luminance([red, green, blue]: [number, number, number]): number {
      const linear = [red, green, blue].map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return (
        0.2126 * (linear[0] ?? 0) +
        0.7152 * (linear[1] ?? 0) +
        0.0722 * (linear[2] ?? 0)
      )
    }
    function contrast(foreground: string, background: string): number {
      const foregroundLuminance = luminance(rgb(foreground))
      const backgroundLuminance = luminance(rgb(background))
      return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
      )
    }

    const heading = document.querySelector("main h1")
    const description = document.querySelector("main h1 + p")
    const card = document.querySelector("main aside")
    const priceNode = Array.from(document.querySelectorAll("main *")).find(
      (element) =>
        /^7[\s\u00a0\u202f]*550\s*FCFA$/u.test(
          element.textContent?.trim() ?? "",
        ),
    )
    if (!heading || !description || !card || !priceNode) {
      throw new Error("titre, description, carte et prix Premium attendus")
    }
    const body = getComputedStyle(document.body)
    const cardStyle = getComputedStyle(card)
    const headingStyle = getComputedStyle(heading)
    const descriptionStyle = getComputedStyle(description)
    const priceStyle = getComputedStyle(priceNode)
    return {
      background: body.backgroundColor,
      bodyFont: body.fontFamily,
      cardContrast: contrast(priceStyle.color, cardStyle.backgroundColor),
      foreground: body.color,
      headingFont: headingStyle.fontFamily,
      headingSize: Number.parseFloat(headingStyle.fontSize),
      priceSize: Number.parseFloat(priceStyle.fontSize),
      textSize: Number.parseFloat(descriptionStyle.fontSize),
      textContrast: contrast(body.color, body.backgroundColor),
    }
  })
  expect(mobileTypography).toEqual(
    expect.objectContaining({
      background: "rgb(251, 248, 243)",
      bodyFont: expect.stringMatching(/Inter/iu),
      foreground: "rgb(7, 24, 61)",
      headingFont: expect.stringMatching(/Montserrat/iu),
    }),
  )
  expect(mobileTypography.headingSize).toBeGreaterThanOrEqual(32)
  expect(mobileTypography.headingSize).toBeLessThanOrEqual(44)
  expect(mobileTypography.textSize).toBeGreaterThanOrEqual(15)
  expect(mobileTypography.textSize).toBeLessThanOrEqual(18)
  expect(mobileTypography.priceSize).toBeGreaterThanOrEqual(36)
  expect(mobileTypography.textContrast).toBeGreaterThanOrEqual(4.5)
  expect(mobileTypography.cardContrast).toBeGreaterThanOrEqual(4.5)

  const controls = main.locator("a:visible, button:visible")
  expect(await controls.count()).toBeGreaterThanOrEqual(3)
  for (let index = 0; index < (await controls.count()); index += 1) {
    const box = await controls.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)

  await page.setViewportSize({ height: 900, width: 1280 })
  await page.goto("/premium")
  const desktopTitle = page
    .getByRole("main")
    .getByRole("heading", { level: 1, name: OFFER_TITLE, exact: true })
  const desktopHeroBox = await desktopTitle.locator("..").boundingBox()
  const desktopCardBox = await page
    .getByRole("main")
    .locator("aside")
    .boundingBox()
  expect(desktopHeroBox).not.toBeNull()
  expect(desktopCardBox).not.toBeNull()
  expect(desktopCardBox?.x ?? 0).toBeGreaterThan(
    (desktopHeroBox?.x ?? 0) + (desktopHeroBox?.width ?? 0),
  )
  expect(desktopCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    (desktopHeroBox?.y ?? 0) + (desktopHeroBox?.height ?? 0),
  )
})

test(`Le CTA adapte l'entrée du tunnel à la session sans changer l'entitlement — ce qui est vérifié
GIVEN : le même écran d'offre consulté anonymement puis par un membre FREE connecté
WHEN  : l'anonyme suit les accès d'inscription et de connexion, puis le membre FREE active Débloquer Synapse Premium
THEN  : l'anonyme va vers /register ou /login, le membre FREE atteint le récapitulatif existant et reste FREE sans nouvelle trace d'attribution`, async ({
  page,
}) => {
  await page.goto("/premium")
  const anonymousMain = page.getByRole("main")
  await expect(
    anonymousMain.getByRole("link", {
      name: "Débloquer Synapse Premium",
      exact: true,
    }),
  ).toHaveAttribute("href", "/register")
  await expect(
    anonymousMain.getByRole("link", { name: "Se connecter", exact: true }),
  ).toHaveAttribute("href", "/login")

  const email = await registerFreePremiumMember(page)
  const userBefore = await premiumTunnelDb.user.findUniqueOrThrow({
    select: { id: true, membership: true },
    where: { email },
  })
  const grantsBefore = await premiumTunnelDb.membershipGrant.count({
    where: { userId: userBefore.id },
  })

  await page.goto("/premium")
  const freeMain = page.getByRole("main")
  const start = freeMain
    .getByRole("button", {
      name: "Débloquer Synapse Premium",
      exact: true,
    })
    .or(
      freeMain.getByRole("link", {
        name: "Débloquer Synapse Premium",
        exact: true,
      }),
    )
  await expect(start).toBeVisible()
  await start.click()
  await expect(
    page.getByRole("heading", { name: /récapitulatif/iu }),
  ).toBeVisible()

  await expect
    .poll(async () =>
      premiumTunnelDb.user.findUnique({
        select: { membership: true },
        where: { id: userBefore.id },
      }),
    )
    .toEqual({ membership: "FREE" })
  expect(
    await premiumTunnelDb.membershipGrant.count({
      where: { userId: userBefore.id },
    }),
  ).toBe(grantsBefore)
})
