import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

const HOME_TITLE = "Apprenez l'IA sous toutes ses formes avec Synapse"
const HOME_DESCRIPTION =
  "Synapse vous aide à comprendre l'intelligence artificielle, découvrir les bons outils et apprendre à les utiliser concrètement dans vos études, votre travail, votre entreprise ou vos projets."

const RUBRIC_LINKS = [
  ["Prompts", "/prompts"],
  ["Formations", "/formations"],
  ["Jeux & concours", "/jeux"],
  ["Bons plans & opportunités", "/opportunites"],
] as const

test(`L'accueil public reprend exactement la promesse validée — ce qui est vérifié
GIVEN : le titre et la description arbitrés pour la page d'accueil
WHEN  : un visiteur anonyme charge l'accueil
THEN  : le h1 et son paragraphe affichent mot pour mot les deux textes validés`, async ({
  page,
}) => {
  const response = await page.goto("/")
  expect(response?.ok()).toBe(true)

  const main = page.getByRole("main")
  await expect(
    main.getByRole("heading", {
      level: 1,
      name: HOME_TITLE,
      exact: true,
    }),
  ).toBeVisible()
  await expect(main.getByText(HOME_DESCRIPTION, { exact: true })).toBeVisible()
})

test(`L'accueil mobile affiche davantage de contenu sans sacrifier la lisibilité — ce qui est vérifié
GIVEN : un visiteur anonyme sur un viewport de 390 par 844 pixels
WHEN  : la page d'accueil est chargée et ses dimensions calculées sont mesurées
THEN  : titre, paragraphe d'introduction, sections, contrôles et cartes restent compacts sous les seuils validés, deux rubriques tiennent dans le premier écran, les cibles font au moins 44 pixels, les visuels restent en 4/3, aucun texte n'est rogné et aucun débordement horizontal n'apparaît`, async ({
  page,
}) => {
  const response = await page.goto("/")
  expect(response?.ok()).toBe(true)

  const main = page.getByRole("main")
  const title = main.getByRole("heading", { level: 1 })
  const heroCopy = main.locator("p").first()
  await expect(title).toBeVisible()
  await expect(heroCopy).toBeVisible()

  expect(
    await title.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeLessThanOrEqual(36)
  expect(
    await heroCopy.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
  ).toBeLessThanOrEqual(17)

  const sectionHeadings = main.getByRole("heading", { level: 2 })
  expect(await sectionHeadings.count()).toBeGreaterThan(0)
  for (let index = 0; index < (await sectionHeadings.count()); index += 1) {
    const heading = sectionHeadings.nth(index)
    expect(
      await heading.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeLessThanOrEqual(28)
  }

  const controls = page.locator(
    "header a:visible, header button:visible, main a:visible, main button:visible",
  )
  expect(await controls.count()).toBeGreaterThan(0)
  for (let index = 0; index < (await controls.count()); index += 1) {
    const control = controls.nth(index)
    const box = await control.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(
      await control.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeLessThanOrEqual(15)
  }

  const rubricBoxes: Array<{
    height: number
    width: number
    x: number
    y: number
  }> = []
  for (const [label, href] of RUBRIC_LINKS) {
    const card = main
      .locator(`a[href="${href}"]`)
      .filter({ hasText: new RegExp(label, "i") })
      .first()
    await expect(card).toHaveAttribute("href", href)
    const box = await card.boundingBox()
    expect(box).not.toBeNull()
    expect(box?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(180)
    if (box) rubricBoxes.push(box)
  }
  const fullyVisibleRubrics = rubricBoxes.filter(
    (box) => box.y >= 0 && box.y + box.height <= 844,
  )
  expect(fullyVisibleRubrics.length).toBeGreaterThanOrEqual(2)

  const contentCards = main.getByRole("article")
  expect(await contentCards.count()).toBeGreaterThan(0)
  for (let index = 0; index < (await contentCards.count()); index += 1) {
    const card = contentCards.nth(index)
    const cardBox = await card.boundingBox()
    expect(cardBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(430)

    const cardMetrics = await card.evaluate((article) => {
      const elements = [article, ...article.querySelectorAll("*")]
      const maximumPadding = Math.max(
        ...elements.flatMap((element) => {
          const style = getComputedStyle(element)
          return [
            style.paddingTop,
            style.paddingRight,
            style.paddingBottom,
            style.paddingLeft,
          ].map(Number.parseFloat)
        }),
      )
      const textElements = Array.from(
        article.querySelectorAll<HTMLElement>("h2, h3, p"),
      ).filter((element) => element.textContent?.trim())

      return {
        maximumPadding,
        text: textElements.map((element) => ({
          clipped:
            element.scrollHeight > element.clientHeight + 1 ||
            element.scrollWidth > element.clientWidth + 1,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        })),
      }
    })
    expect(cardMetrics.maximumPadding).toBeLessThanOrEqual(20)
    expect(cardMetrics.text.length).toBeGreaterThan(0)
    for (const text of cardMetrics.text) {
      expect(text.fontSize).toBeLessThanOrEqual(18)
      expect(text.clipped).toBe(false)
    }

    const images = card.locator("img")
    for (
      let imageIndex = 0;
      imageIndex < (await images.count());
      imageIndex += 1
    ) {
      const box = await images.nth(imageIndex).boundingBox()
      expect(box).not.toBeNull()
      expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(4 / 3, 1)
    }
  }

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false)
})

test(`Le footer minimal conserve les pages institutionnelles hors de sa navigation — ce qui est vérifié
GIVEN : le shell public et les cinq pages institutionnelles existantes
WHEN  : le footer de l'accueil est recensé puis chaque URL institutionnelle est demandée directement
THEN  : seuls Contact et À propos sont rendus dans le footer, sans autre texte ni offre, tandis que les cinq pages continuent de répondre sans être supprimées`, async ({
  page,
  request,
}) => {
  await page.goto("/")
  const footer = page.getByRole("contentinfo")
  const links = footer.getByRole("link")
  await expect(links).toHaveCount(2)
  await expect(footer.getByRole("link", { name: "Contact" })).toHaveAttribute(
    "href",
    "/contact",
  )
  await expect(footer.getByRole("link", { name: "À propos" })).toHaveAttribute(
    "href",
    "/a-propos",
  )

  const textOutsideLinks = await footer.evaluate((element) => {
    const clone = element.cloneNode(true)
    if (!(clone instanceof HTMLElement)) {
      throw new Error("le footer cloné doit rester un élément HTML")
    }
    clone.querySelectorAll("a").forEach((link) => link.remove())
    return clone.textContent?.replace(/\s+/g, " ").trim() ?? ""
  })
  expect(textOutsideLinks).toBe("")

  for (const path of [
    "/a-propos",
    "/contact",
    "/mentions-legales",
    "/confidentialite",
    "/conditions-utilisation",
  ]) {
    const response = await request.get(path)
    expect(response.ok(), path).toBe(true)
    expect(await response.text(), path).toMatch(/<h1[\s>]/i)
  }
})
