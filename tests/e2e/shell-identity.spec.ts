import { randomUUID } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

async function openMobileMenu(page: Page) {
  const toggle = page.getByRole("button", { name: /ouvrir.*menu|menu/i })
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  return toggle
}

test(`Le shell transforme le parcours mobile en site cohérent — ce qui est vérifié
GIVEN : un visiteur anonyme sur un viewport de 390px
WHEN  : il comprend l'accueil, ouvre le menu au clavier et visite les quatre rubriques puis les cinq pages institutionnelles
THEN  : chaque destination répond, le header et le footer restent présents, les cibles font au moins 44px et le menu se ferme par Échap en restaurant le focus`, async ({
  page,
}) => {
  const response = await page.goto("/")
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Synapse/i,
  )
  await expect(page.getByRole("main")).toContainText(/jeunes ivoiriens/i)
  await expect(page.getByRole("contentinfo")).toBeVisible()

  const toggle = page.getByRole("button", { name: /ouvrir.*menu|menu/i })
  await toggle.focus()
  await page.keyboard.press("Enter")
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByRole("link", { name: /^Prompts/i })).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")

  const rubricRoutes = [
    ["Prompts", "/prompts"],
    ["Formations", "/formations"],
    ["Jeux & concours", "/jeux"],
    ["Bons plans & opportunités", "/opportunites"],
  ] as const
  for (const [name, href] of rubricRoutes) {
    await openMobileMenu(page)
    const link = page.getByRole("link", { name: new RegExp(`^${name}`, "i") })
    const box = await link.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    const navigation = await Promise.all([
      page.waitForURL(new RegExp(`${href}$`)),
      link.click(),
    ])
    expect(navigation[0]).toBeUndefined()
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      new RegExp(name.split(" ")[0] ?? name, "i"),
    )
    await expect(page.getByRole("contentinfo")).toBeVisible()
  }

  const institutionalRoutes = [
    ["À propos", "/a-propos"],
    ["Contact", "/contact"],
    ["Mentions légales", "/mentions-legales"],
    ["Confidentialité", "/confidentialite"],
    ["Conditions d'utilisation", "/conditions-utilisation"],
  ] as const
  for (const [name, href] of institutionalRoutes) {
    await page.goto(href)
    await expect(page).toHaveURL(new RegExp(`${href}$`))
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      new RegExp(name, "i"),
    )
    await expect(page.getByRole("banner")).toBeVisible()
    await expect(page.getByRole("contentinfo")).toBeVisible()
  }
})

test(`La navigation reflète une nouvelle session FREE — ce qui est vérifié
GIVEN : un visiteur anonyme qui crée un compte depuis le shell mobile
WHEN  : il revient sur l'accueil dans la même session
THEN  : Connexion disparaît, Compte apparaît et l'indicateur de session annonce l'adhésion gratuite sans présenter l'utilisateur comme membre Premium`, async ({
  page,
}) => {
  const email = `shell-${randomUUID()}@example.test`
  const password = `Aa!${randomUUID()}2026`

  await page.goto("/register")
  await page.getByLabel(/e-mail|email/i).fill(email)
  await page.getByLabel(/^mot de passe/i).fill(password)
  await page
    .getByRole("button", { name: /créer|inscription|s'inscrire/i })
    .click()
  await expect(page).toHaveURL(/\/compte$/)

  await page.goto("/")
  await openMobileMenu(page)
  const shellIdentity = page.getByRole("banner").locator(".session-indicator")
  await expect(
    shellIdentity.getByRole("link", { name: /compte/i }),
  ).toBeVisible()
  await expect(
    shellIdentity.getByText(/membre gratuit|accès gratuit/i),
  ).toBeVisible()
  await expect(shellIdentity.getByText(/^premium$/i)).toHaveCount(0)
  await expect(
    shellIdentity.getByRole("link", { name: /connexion/i }),
  ).toHaveCount(0)
})

test(`Les métadonnées servies produisent un aperçu de partage absolu — ce qui est vérifié
GIVEN : SITE_URL=http://localhost:3000 sans domaine acheté et le report validé du contrôle WhatsApp réel
WHEN  : un client lit l'accueil, une rubrique, robots.txt, sitemap.xml et manifest.webmanifest
THEN  : titres, descriptions et image Open Graph absolue sont servis, les routes SEO répondent et le sitemap exclut tout espace protégé`, async ({
  page,
  request,
}) => {
  for (const path of ["/", "/prompts"]) {
    await page.goto(path)
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      /Synapse/i,
    )
    await expect(
      page.locator('meta[property="og:description"]'),
    ).toHaveAttribute("content", /.+/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /^http:\/\/localhost:3000\//,
    )
  }

  const robots = await request.get("/robots.txt")
  const sitemap = await request.get("/sitemap.xml")
  const manifest = await request.get("/manifest.webmanifest")
  expect(robots.ok()).toBe(true)
  expect(sitemap.ok()).toBe(true)
  expect(manifest.ok()).toBe(true)
  expect(await robots.text()).toContain("http://localhost:3000/sitemap.xml")
  const sitemapBody = await sitemap.text()
  expect(sitemapBody).toContain("http://localhost:3000/prompts")
  expect(sitemapBody).not.toMatch(
    /\/(?:compte|premium|login|register|forgot-password|api)(?:<|\/)/,
  )
})

test(`L'identité et le fallback restent lisibles à 390px — ce qui est vérifié
GIVEN : l'accueil alimenté par un prompt sans image et la charte Synapse appliquée
WHEN  : le visiteur observe la page et navigue au clavier
THEN  : fond crème, bleu nuit, Inter, Montserrat, fallback 4/3, focus visible et absence de débordement sont mesurés dans le navigateur`, async ({
  page,
}) => {
  await page.goto("/")
  const visual = page.getByRole("article").first().locator("img")
  await expect(visual).toBeVisible()
  const box = await visual.boundingBox()
  expect(box).not.toBeNull()
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(4 / 3, 1)

  const presentation = await page.evaluate(() => {
    const body = getComputedStyle(document.body)
    const title = getComputedStyle(
      document.querySelector("h1") ?? document.body,
    )
    return {
      background: body.backgroundColor,
      bodyFont: body.fontFamily,
      foreground: body.color,
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth,
      titleFont: title.fontFamily,
    }
  })
  expect(presentation).toEqual(
    expect.objectContaining({
      background: "rgb(251, 248, 243)",
      bodyFont: expect.stringMatching(/Inter/i),
      foreground: "rgb(7, 24, 61)",
      hasHorizontalOverflow: false,
      titleFont: expect.stringMatching(/Montserrat/i),
    }),
  )

  const contrast = await page.evaluate(() => {
    function rgb(value: string): [number, number, number] {
      const channels = value
        .match(/\d+(?:\.\d+)?/g)
        ?.slice(0, 3)
        .map(Number)
      if (!channels || channels.length !== 3)
        throw new Error("couleur RGB attendue")
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
    const body = getComputedStyle(document.body)
    const light = luminance(rgb(body.backgroundColor))
    const dark = luminance(rgb(body.color))
    return (Math.max(light, dark) + 0.05) / (Math.min(light, dark) + 0.05)
  })
  expect(contrast).toBeGreaterThanOrEqual(4.5)

  await page.keyboard.press("Tab")
  const focusAppearance = await page
    .locator(":focus-visible")
    .evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
      }
    })
  expect(focusAppearance.outlineStyle).not.toBe("none")
  expect(Number.parseFloat(focusAppearance.outlineWidth)).toBeGreaterThan(0)
})
