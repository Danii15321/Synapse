import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPromptDto(
  value: unknown,
): value is { id: string; slug: string; summary: string; title: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.summary === "string" &&
    typeof value.title === "string"
  )
}

test(`La route publique /prompts affiche les deux prompts lus en base — ce qui est vérifié
GIVEN : PostgreSQL migré, le seed rejoué et un viewport mobile de 390px
WHEN  : un visiteur ouvre /prompts après lecture de la réponse HTTP brute de /api/prompts
THEN  : l'API renvoie exactement deux DTO valides, leurs titres et résumés sont visibles sur la page, et aucun débordement horizontal n'apparaît`, async ({
  page,
  request,
}) => {
  const apiResponse = await request.get("/api/prompts")
  const rawBody = await apiResponse.text()

  expect(apiResponse.status()).toBe(200)
  const payload: unknown = JSON.parse(rawBody)
  expect(Array.isArray(payload)).toBe(true)
  if (!Array.isArray(payload) || !payload.every(isPromptDto)) {
    throw new Error("GET /api/prompts doit renvoyer un tableau de DTO prompts")
  }
  expect(payload).toHaveLength(2)

  const pageResponse = await page.goto("/prompts")

  expect(pageResponse?.status()).toBe(200)
  await expect(page.locator("main")).toBeVisible()
  for (const prompt of payload) {
    await expect(
      page.getByRole("heading", { name: prompt.title }),
    ).toBeVisible()
    await expect(page.getByText(prompt.summary, { exact: true })).toBeVisible()
  }
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test(`La route de lecture refuse les méthodes non prévues — ce qui est vérifié
GIVEN : le BFF public de liste qui ne déclare qu'un GET
WHEN  : un client envoie un POST à /api/prompts
THEN  : la réponse HTTP brute porte exactement le statut 405 Method Not Allowed`, async ({
  request,
}) => {
  const response = await request.post("/api/prompts")

  expect(response.status()).toBe(405)
})
