import { createHash, randomUUID } from "node:crypto"

import { expect, test } from "@playwright/test"

import {
  cleanupReferenceFixtures,
  db,
  firstPrompt,
  insertCatalog,
  registerFreeMember,
} from "./prompt-reference-helpers"

test.use({ viewport: { width: 390, height: 844 } })
test.describe.configure({ mode: "default" })

test.afterEach(cleanupReferenceFixtures)

test.afterAll(async () => {
  await db.$disconnect()
})

function visiblePromptBody(body: string): string {
  const lines = body.split(/\r?\n/u)
  const hasMarkdownHeading = lines.some((line) =>
    /^(#{1,3})\s+(.+)$/u.test(line.trim()),
  )
  if (!hasMarkdownHeading) return body

  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^(?:#{1,3})\s+/u, ""))
    .map((line) =>
      line.replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1"),
    )
    .join("\n")
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

test(`La liste reste utilisable à 390px sous réseau bridé, avec filtres, recherche et pagination — ce qui est vérifié
GIVEN : 205 prompts publiés isolés par un tag, une image de repli et un profil réseau mobile dégradé
WHEN  : un anonyme ouvre /prompts, soumet ses filtres, suit le curseur vers la page suivante puis soumet ses recherches
THEN  : loading, succès filtré, page suivante sans doublon, empty et résultat recherché sont accessibles sans débordement horizontal`, async ({
  page,
}) => {
  const prefix = `t07-e2e-list-${randomUUID()}`
  await insertCatalog(prefix)
  const client = await page.context().newCDPSession(page)
  await client.send("Network.enable")
  await client.send("Network.emulateNetworkConditions", {
    connectionType: "cellular3g",
    downloadThroughput: 64 * 1024,
    latency: 300,
    offline: false,
    uploadThroughput: 32 * 1024,
  })

  const navigation = page.goto("/prompts")
  await expect(page.getByRole("status")).toContainText(/chargement/i)
  await navigation
  await page.getByRole("combobox", { name: /domaine/i }).selectOption("ia")
  await page.getByRole("combobox", { name: /tag/i }).selectOption(prefix)
  const submit = page.getByRole("button", {
    name: /appliquer|filtrer|rechercher/i,
  })
  const filterSubmission = submit.click()
  await expect(page.getByRole("status")).toContainText(/chargement/i)
  await filterSubmission
  await expect(page).toHaveURL(/domain=ia/u)
  await expect(page).toHaveURL(new RegExp(`tag=${prefix}`, "u"))
  const cardsBefore = page.getByRole("main").locator("article")
  await expect(cardsBefore.first()).toBeVisible()
  const firstPageHrefs = await cardsBefore
    .locator('a[href^="/prompts/"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    )
  expect(firstPageHrefs.length).toBeGreaterThan(0)
  const pagination = page
    .getByRole("link", { name: /suivant|page suivante/i })
    .or(page.getByRole("button", { name: /suivant|page suivante/i }))
  await expect(pagination).toBeVisible()
  const firstPageUrl = page.url()
  await pagination.click()
  await expect(page).not.toHaveURL(firstPageUrl)
  expect(new URL(page.url()).searchParams.get("cursor")).toBeTruthy()
  const nextPageHrefs = await page
    .getByRole("main")
    .locator('article a[href^="/prompts/"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute("href") ?? ""),
    )
  expect(nextPageHrefs.length).toBeGreaterThan(0)
  expect(nextPageHrefs.filter((href) => firstPageHrefs.includes(href))).toEqual(
    [],
  )

  const search = page.getByRole("searchbox", { name: /recherch/i })
  await search.fill(`${prefix} aucun résultat`)
  await submit.click()
  expect(new URL(page.url()).searchParams.get("search")).toBe(
    `${prefix} aucun résultat`,
  )
  await expect(page.getByText(/aucun prompt|aucun résultat/i)).toBeVisible()
  await search.fill("aiguille recherche unique")
  await submit.click()
  expect(new URL(page.url()).searchParams.get("search")).toBe(
    "aiguille recherche unique",
  )
  await expect(
    page.getByRole("heading", { name: `${prefix} Prompt 137` }),
  ).toBeVisible()
  await expect(page.getByRole("main").locator("article")).toHaveCount(1)
  const image = page.getByRole("main").getByRole("img")
  await expect(image).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})

test(`Anonyme et membre FREE ne reçoivent aucun octet premium dans JSON, HTML, RSC, metadata ou URL — ce qui est vérifié
GIVEN : un prompt PREMIUM publié avec body sentinelle, un contexte anonyme puis un compte FREE
WHEN  : chacun demande directement l'API et le HTML, puis ouvre le détail et inspecte ses liens
THEN  : summary ou excerpt alimente la page et Open Graph, body et sa version encodée sont absents partout, et Copier/menu fournisseurs n'existent pas`, async ({
  browser,
  page,
}) => {
  const prompt = await firstPrompt("PREMIUM")
  const encodedBody = encodeURIComponent(prompt.body)

  for (const actor of ["anonymous", "free"] as const) {
    const actorPage =
      actor === "anonymous"
        ? await (
            await browser.newContext({
              baseURL: "http://localhost:3000",
              viewport: { height: 844, width: 390 },
            })
          ).newPage()
        : page
    if (actor === "free") {
      await registerFreeMember(actorPage)
    }
    const api = await actorPage.request.get(`/api/prompts/${prompt.slug}`)
    const rawJson = await api.text()
    const html = await actorPage.request.get(`/prompts/${prompt.slug}`)
    const rawHtml = await html.text()
    const rsc = await actorPage.request.get(`/prompts/${prompt.slug}`, {
      headers: { RSC: "1" },
    })
    const rawRsc = await rsc.text()

    expect(api.status()).toBe(200)
    expect(rawJson).not.toMatch(/"body"/u)
    expect(rawJson).not.toContain(prompt.body)
    expect(rawHtml).not.toContain(prompt.body)
    expect(rawHtml).not.toContain(JSON.stringify(prompt.body).slice(1, -1))
    expect(rawHtml).not.toContain(encodedBody)
    expect(rawRsc).not.toContain(prompt.body)
    expect(rawRsc).not.toContain(JSON.stringify(prompt.body).slice(1, -1))
    expect(rawHtml).toContain(prompt.summary)
    expect(rawHtml).toMatch(/property=["']og:description["']/iu)

    await actorPage.goto(`/prompts/${prompt.slug}`)
    await expect(
      actorPage.getByRole("button", { name: /copier/i }),
    ).toHaveCount(0)
    await expect(
      actorPage.getByRole("button", { name: /ouvrir dans/i }),
    ).toHaveCount(0)
    expect(
      await actorPage
        .locator('meta[property="og:description"]')
        .getAttribute("content"),
    ).toBe(prompt.summary)
    const urls = await actorPage
      .locator("a")
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute("href") ?? ""),
      )
    expect(urls.join("\n")).not.toContain(prompt.body)
    expect(urls.join("\n")).not.toContain(encodedBody)
    if (actor === "anonymous") {
      await actorPage.context().close()
    }
  }
})

test(`Un membre PREMIUM copie le corps puis ouvre ChatGPT ou Claude sans l'injecter dans l'URL — ce qui est vérifié
GIVEN : une session database promue PREMIUM, un prompt PREMIUM et la permission presse-papiers
WHEN  : le membre copie, puis choisit successivement Ouvrir dans ChatGPT et Ouvrir dans Claude
THEN  : le corps exact est copié, une annonce demande de le coller, les nouveaux onglets ciblent les deux URLs gelées avec noopener/noreferrer, et aucun href, attribut, URL, log ou paramètre ne contient le corps`, async ({
  page,
}) => {
  const prompt = await firstPrompt("PREMIUM")
  const email = await registerFreeMember(page)
  await db.user.update({
    data: { membership: "PREMIUM" },
    where: { email },
  })
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  const externalReferrers: Array<string | undefined> = []
  await page.context().route("https://chatgpt.com/**", (route) => {
    externalReferrers.push(route.request().headers().referer)
    return route.fulfill({
      body: "ChatGPT",
      contentType: "text/html",
      status: 200,
    })
  })
  await page.context().route("https://claude.ai/**", (route) => {
    externalReferrers.push(route.request().headers().referer)
    return route.fulfill({
      body: "Claude",
      contentType: "text/html",
      status: 200,
    })
  })
  const consoleMessages: string[] = []
  const outboundRequests: Array<{ body: string | null; url: string }> = []
  page.on("console", (message) => consoleMessages.push(message.text()))
  page.on("request", (request) =>
    outboundRequests.push({ body: request.postData(), url: request.url() }),
  )
  await page.goto(`/prompts/${prompt.slug}`)

  await page.getByRole("button", { name: /^copier/i }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    prompt.body,
  )
  await expect(page.getByRole("status")).toContainText(/copi|coller/i)

  for (const provider of [
    { label: /chatgpt/i, url: "https://chatgpt.com/" },
    { label: /claude/i, url: "https://claude.ai/new" },
  ]) {
    await page.getByRole("button", { name: /ouvrir dans/i }).click()
    const item = page.getByRole("menuitem", { name: provider.label })
    await expect(item).toBeVisible()
    const popupPromise = page.waitForEvent("popup")
    await item.click()
    const popup = await popupPromise
    await expect.poll(() => popup.url()).toBe(provider.url)
    expect(await popup.evaluate(() => window.opener === null)).toBe(true)
    await popup.close()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      prompt.body,
    )
    await expect(page.getByRole("status")).toContainText(/coller/i)
  }
  expect(externalReferrers).toEqual([undefined, undefined])

  const serializedAttributes = await page
    .locator("*")
    .evaluateAll((nodes) =>
      nodes.flatMap((node) =>
        Array.from(node.attributes).map(
          (attribute) => `${attribute.name}=${attribute.value}`,
        ),
      ),
    )
  expect(serializedAttributes.join("\n")).not.toContain(prompt.body)
  expect(page.url()).not.toContain(encodeURIComponent(prompt.body))
  expect(consoleMessages.join("\n")).not.toContain(prompt.body)
  expect(JSON.stringify(outboundRequests)).not.toContain(prompt.body)
  expect(JSON.stringify(outboundRequests)).not.toContain(
    encodeURIComponent(prompt.body),
  )
})

test(`Un prompt FREE se copie et préremplit Claude, tandis que ChatGPT reste sans injection — ce qui est vérifié
GIVEN : un prompt FREE publié visible dans la carte de référence sur un viewport de 390px
WHEN  : un anonyme ouvre sa carte, touche Copier puis choisit Claude et ChatGPT
THEN  : titre, summary, image 4/3 et corps distinct sont visibles, la copie restitue exactement le body, Claude reçoit le corps encodé via son lien officiel, ChatGPT garde son URL fixe et chaque action mesure au moins 44px`, async ({
  page,
}) => {
  const prompt = await firstPrompt("FREE")
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await page.goto(`/prompts?search=${encodeURIComponent(prompt.title)}`)
  const cardLink = page.getByRole("link", {
    name: new RegExp(prompt.title, "i"),
  })
  await expect(cardLink).toBeVisible()
  await cardLink.click()
  await expect(page).toHaveURL(new RegExp(`/prompts/${prompt.slug}$`, "u"))
  await expect(
    page.getByRole("heading", { name: prompt.title, exact: true }),
  ).toBeVisible()
  await expect(page.getByText(prompt.summary, { exact: true })).toBeVisible()
  const promptBody = page.locator(".prompt-body-text")
  await expect(promptBody).toBeVisible()
  expect(
    sha256(await promptBody.innerText()),
    "le corps du prompt rendu doit correspondre intégralement à la ressource",
  ).toBe(sha256(visiblePromptBody(prompt.body)))
  const copy = page.getByRole("button", { name: /^copier/i })
  const box = await copy.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
  await copy.click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    prompt.body,
  )

  await page.evaluate(() => {
    window.open = (url?: string | URL): Window | null => {
      Reflect.set(window, "__synapseProviderUrl", String(url))
      return null
    }
  })
  await page.getByRole("button", { name: /ouvrir dans/i }).click()
  await page.getByRole("menuitem", { name: /claude/i }).click()
  const claudeUrl: unknown = await page.evaluate(() =>
    Reflect.get(window, "__synapseProviderUrl"),
  )
  expect(claudeUrl).toBe(
    `claude://claude.ai/new?q=${encodeURIComponent(prompt.body)}`,
  )
  await expect(page.getByRole("status")).toContainText(/prérempli|secours/i)

  await page.getByRole("button", { name: /ouvrir dans/i }).click()
  await page.getByRole("menuitem", { name: /chatgpt/i }).click()
  const chatGptUrl: unknown = await page.evaluate(() =>
    Reflect.get(window, "__synapseProviderUrl"),
  )
  expect(chatGptUrl).toBe("https://chatgpt.com/")
})
