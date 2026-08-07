import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

test(
  `Le socle démarre et affiche une page Tailwind sur mobile — ce qui est vérifié
GIVEN : l'application lancée depuis un clone configuré et un viewport de 390px
WHEN  : un visiteur ouvre la page d'accueil
THEN  : la réponse est saine, le contenu principal est visible et la page stylée ne déborde pas horizontalement`,
  async ({ page }) => {
    const response = await page.goto("/")

    expect(response?.ok()).toBe(true)
    await expect(page.locator("main")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()

    const presentation = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body)
      return {
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        backgroundColor: bodyStyle.backgroundColor,
        textColor: bodyStyle.color,
      }
    })

    expect(presentation.hasHorizontalOverflow).toBe(false)
    expect(presentation.backgroundColor).not.toBe("rgba(0, 0, 0, 0)")
    expect(presentation.textColor).not.toBe("rgb(0, 0, 0)")
  },
)
