import { expect, test } from "@playwright/test"

test.use({ viewport: { width: 390, height: 844 } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPromptDto(value: unknown): value is {
  coverImage: string | null
  domain: string
  id: string
  slug: string
  summary: string
  tags: string[]
  title: string
  visibility: string
} {
  return (
    isRecord(value) &&
    (typeof value.coverImage === "string" || value.coverImage === null) &&
    typeof value.domain === "string" &&
    typeof value.id === "string" &&
    typeof value.slug === "string" &&
    typeof value.summary === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.title === "string" &&
    typeof value.visibility === "string"
  )
}

test(`La route publique /prompts affiche les deux prompts lus en base — ce qui est vérifié
GIVEN : PostgreSQL migré, le seed rejoué et un viewport mobile de 390px
WHEN  : un visiteur ouvre /prompts après lecture de la réponse HTTP brute de /api/prompts
THEN  : l'API renvoie une page stable items/nextCursor avec les deux DTO publics du seed, leurs titres et résumés sont visibles sur la page, et aucun débordement horizontal n'apparaît`, async ({
  page,
  request,
}) => {
  const apiResponse = await request.get("/api/prompts")
  const rawBody = await apiResponse.text()

  expect(apiResponse.status()).toBe(200)
  const payload: unknown = JSON.parse(rawBody)
  expect(isRecord(payload)).toBe(true)
  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    !payload.items.every(isPromptDto) ||
    !(typeof payload.nextCursor === "string" || payload.nextCursor === null)
  ) {
    throw new Error(
      "GET /api/prompts doit renvoyer une page { items, nextCursor }",
    )
  }
  expect(Object.keys(payload).sort()).toEqual(["items", "nextCursor"])
  expect(payload.items).toHaveLength(2)
  expect(payload.nextCursor).toBeNull()
  const firstPrompt = payload.items[0]
  if (!firstPrompt) {
    throw new Error("le seed doit fournir un premier prompt")
  }

  const pageResponse = await page.goto("/prompts")

  expect(pageResponse?.status()).toBe(200)
  const finalMain = page.getByRole("main").filter({
    has: page.getByRole("heading", { name: firstPrompt.title, exact: true }),
  })
  await expect(finalMain).toBeVisible()
  for (const prompt of payload.items) {
    await expect(
      finalMain.getByRole("heading", { name: prompt.title }),
    ).toBeVisible()
    await expect(
      finalMain.getByText(prompt.summary, { exact: true }),
    ).toBeVisible()
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
