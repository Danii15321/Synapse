import { expect, test, type Locator, type Page } from "@playwright/test"

const HERO_HEADING =
  "Une startup ivoirienne qui transforme l'information en opportunités."
const STATEMENT_HEADING = "« L'information est la première inégalité. »"
const PILLARS_HEADING = "Trois piliers au cœur de Synapse"
const PLATFORM_HEADING = "Un espace dédié à l'IA et à l'entrepreneuriat."
const SOCIAL_HEADING = "Retrouvez Synapse sur nos réseaux"

async function boxesOf(locator: Locator) {
  const boxes = []
  for (const element of await locator.all()) {
    const box = await element.boundingBox()
    if (!box) throw new Error("chaque bloc À propos doit avoir une géométrie")
    boxes.push(box)
  }
  return boxes
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
}

test(`À propos conserve le shell unique et ne publie aucun faux canal — ce qui est vérifié
GIVEN : aucune URL sociale officielle et la maquette qui contient un footer WhatsApp de démonstration
WHEN  : un visiteur ouvre /a-propos et télécharge aussi son HTML brut
THEN  : le shell partagé apparaît une seule fois, les trois réseaux sont informatifs, et aucun numéro, Atalakou, wa.me, href factice ou destination inventée n'atteint le navigateur`, async ({
  page,
}) => {
  const response = await page.request.get("/a-propos")
  const raw = await response.text()
  expect(response.status()).toBe(200)
  expect(raw).not.toMatch(/2250703381175|Atalakou|wa\.me|href=["']#["']/iu)

  await page.goto("/a-propos")
  await expect(page.getByRole("banner")).toHaveCount(1)
  await expect(page.getByRole("main")).toHaveCount(1)
  await expect(page.getByRole("contentinfo")).toHaveCount(1)
  for (const label of ["Facebook", "TikTok", "Chaîne WhatsApp"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
    await expect(page.getByRole("link", { name: label })).toHaveCount(0)
    await expect(page.getByRole("button", { name: label })).toHaveCount(0)
  }
})

test(`À propos est lisible et empilé sur un mobile de 390 px — ce qui est vérifié
GIVEN : le contenu exact des cinq blocs et un viewport mobile 390x844
WHEN  : le visiteur parcourt hero, conviction, trois piliers, plateforme et réseaux
THEN  : les blocs suivent l'ordre de la maquette sans overflow, piliers et plateforme s'empilent, les textes restent lisibles et les couleurs/polices viennent de la charte Synapse`, async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 })
  await page.goto("/a-propos")

  const main = page.getByRole("main")
  const regions = main.getByRole("region")
  await expect(regions).toHaveCount(5)
  for (const heading of [
    HERO_HEADING,
    STATEMENT_HEADING,
    PILLARS_HEADING,
    PLATFORM_HEADING,
    SOCIAL_HEADING,
  ]) {
    await expect(main.getByRole("heading", { name: heading })).toBeVisible()
  }
  expect(await hasHorizontalOverflow(page)).toBe(false)

  const regionBoxes = await boxesOf(regions)
  for (let index = 1; index < regionBoxes.length; index += 1) {
    expect(regionBoxes[index]?.y ?? 0).toBeGreaterThan(
      (regionBoxes[index - 1]?.y ?? 0) + (regionBoxes[index - 1]?.height ?? 0),
    )
  }

  const pillarCards = main
    .getByRole("region", { name: PILLARS_HEADING })
    .getByRole("article")
  const pillarBoxes = await boxesOf(pillarCards)
  expect(pillarBoxes).toHaveLength(3)
  for (let index = 1; index < pillarBoxes.length; index += 1) {
    expect(
      Math.abs((pillarBoxes[index]?.x ?? 0) - (pillarBoxes[0]?.x ?? 0)),
    ).toBeLessThanOrEqual(1)
    expect(pillarBoxes[index]?.y ?? 0).toBeGreaterThan(
      (pillarBoxes[index - 1]?.y ?? 0) + (pillarBoxes[index - 1]?.height ?? 0),
    )
  }

  const platformColumns = main
    .getByRole("region", { name: PLATFORM_HEADING })
    .locator(":scope > div")
  await expect(platformColumns).toHaveCount(2)
  const mobilePlatformBoxes = await boxesOf(platformColumns)
  expect(
    Math.abs(
      (mobilePlatformBoxes[1]?.x ?? 0) - (mobilePlatformBoxes[0]?.x ?? 0),
    ),
  ).toBeLessThanOrEqual(1)
  expect(mobilePlatformBoxes[1]?.y ?? 0).toBeGreaterThan(
    (mobilePlatformBoxes[0]?.y ?? 0) + (mobilePlatformBoxes[0]?.height ?? 0),
  )

  const visualContract = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const body = getComputedStyle(document.body)
    const heading = document.querySelector("main h1")
    const eyebrow = Array.from(document.querySelectorAll("main *")).find(
      (element) => element.textContent?.trim() === "À propos de Synapse",
    )
    const intro = Array.from(document.querySelectorAll("main p")).find(
      (element) => element.textContent?.includes("nouvelles technologies"),
    )
    const pillarCopy = Array.from(
      document.querySelectorAll("main article p"),
    )[0]
    if (!heading || !eyebrow || !intro || !pillarCopy) {
      throw new Error("les éléments typographiques À propos sont requis")
    }
    return {
      bodyBackground: body.backgroundColor,
      bodyFont: body.fontFamily,
      cream: root.getPropertyValue("--color-cream").trim(),
      eyebrowColor: getComputedStyle(eyebrow).color,
      headingColor: getComputedStyle(heading).color,
      headingFont: getComputedStyle(heading).fontFamily,
      headingSize: Number.parseFloat(getComputedStyle(heading).fontSize),
      introSize: Number.parseFloat(getComputedStyle(intro).fontSize),
      magenta: root.getPropertyValue("--color-magenta").trim(),
      night: root.getPropertyValue("--color-night").trim(),
      pillarCopySize: Number.parseFloat(getComputedStyle(pillarCopy).fontSize),
    }
  })
  expect(visualContract.bodyFont).toMatch(/Inter/iu)
  expect(visualContract.headingFont).toMatch(/Montserrat/iu)
  expect(visualContract.cream).toBe("#fbf8f3")
  expect(visualContract.night).toBe("#07183d")
  expect(visualContract.magenta).toBe("#c00062")
  expect(visualContract.bodyBackground).toBe("rgb(251, 248, 243)")
  expect(visualContract.headingColor).toBe("rgb(7, 24, 61)")
  expect(visualContract.eyebrowColor).toBe("rgb(192, 0, 98)")
  expect(visualContract.headingSize).toBeGreaterThanOrEqual(36)
  expect(visualContract.introSize).toBeGreaterThanOrEqual(16)
  expect(visualContract.pillarCopySize).toBeGreaterThanOrEqual(14)
})

test(`À propos retrouve les colonnes de la maquette à 1280 px — ce qui est vérifié
GIVEN : le même contenu dans un viewport desktop 1280x900
WHEN  : les grilles des piliers et de la plateforme sont mesurées
THEN  : les trois piliers partagent une rangée, la plateforme forme deux colonnes et la page ne déborde pas horizontalement`, async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 })
  await page.goto("/a-propos")
  const main = page.getByRole("main")

  const pillarBoxes = await boxesOf(
    main.getByRole("region", { name: PILLARS_HEADING }).getByRole("article"),
  )
  expect(pillarBoxes).toHaveLength(3)
  expect(
    Math.max(...pillarBoxes.map((box) => box.y)) -
      Math.min(...pillarBoxes.map((box) => box.y)),
  ).toBeLessThanOrEqual(2)
  expect(pillarBoxes[1]?.x ?? 0).toBeGreaterThan(
    (pillarBoxes[0]?.x ?? 0) + (pillarBoxes[0]?.width ?? 0),
  )
  expect(pillarBoxes[2]?.x ?? 0).toBeGreaterThan(
    (pillarBoxes[1]?.x ?? 0) + (pillarBoxes[1]?.width ?? 0),
  )

  const platformColumns = main
    .getByRole("region", { name: PLATFORM_HEADING })
    .locator(":scope > div")
  const platformBoxes = await boxesOf(platformColumns)
  expect(platformBoxes).toHaveLength(2)
  expect(
    Math.abs((platformBoxes[1]?.y ?? 0) - (platformBoxes[0]?.y ?? 0)),
  ).toBeLessThanOrEqual(2)
  expect(platformBoxes[1]?.x ?? 0).toBeGreaterThan(
    (platformBoxes[0]?.x ?? 0) + (platformBoxes[0]?.width ?? 0),
  )
  expect(await hasHorizontalOverflow(page)).toBe(false)
})
