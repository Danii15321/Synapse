import { PrismaClient } from "@prisma/client"
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import {
  createResourceProject,
  databaseClient,
  isolatedDatabaseUrl,
  removeResourceProject,
  resetIsolatedDatabase,
  runSeed,
  scenario,
  type ResourceProject,
} from "../fixtures/resource-import-test-utils"

type RouteModule = Readonly<{
  GET: (
    request: Request,
    context?: Readonly<{ params: Promise<{ slug: string }> }>,
  ) => Promise<Response> | Response
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isRouteModule(value: unknown): value is RouteModule {
  return isRecord(value) && typeof value.GET === "function"
}

async function loadRoute(modulePath: string): Promise<RouteModule> {
  const module: unknown = await vi.importActual(modulePath)
  if (!isRouteModule(module)) {
    throw new Error(`${modulePath} doit exporter GET`)
  }
  return module
}

const databaseUrl = isolatedDatabaseUrl("api")
let originalDatabaseUrl: string | undefined
let project: ResourceProject
let db: PrismaClient

describe("routes HTTP alimentées par l'import des ressources", () => {
  beforeAll(async () => {
    originalDatabaseUrl = process.env.DATABASE_URL
    const reset = resetIsolatedDatabase(databaseUrl)
    expect(reset.status, reset.output).toBe(0)
    project = await createResourceProject()
    const seed = runSeed(project, databaseUrl)
    expect(seed.status, seed.output).toBe(0)
    process.env.DATABASE_URL = databaseUrl
    db = databaseClient(databaseUrl)
  }, 120_000)

  afterEach(() => {
    vi.doUnmock("@/server/auth/config")
    vi.resetModules()
  })

  afterAll(async () => {
    await db.$disconnect()
    await removeResourceProject(project)
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
  })

  it(
    scenario(
      "GET /api/prompts pagine les 69 ressources importées sans sérialiser leur corps",
      "une vraie base PostgreSQL chargée par le seed synthétique avec 20 prompts FREE et 49 PREMIUM",
      "le Route Handler public reçoit GET /api/prompts?take=100",
      "la réponse HTTP brute vaut 200, contient 69 cartes et la répartition 20/49, sans aucune clé body ni sentinelle de corps",
    ),
    async () => {
      const route = await loadRoute("@/app/api/prompts/route")

      const response = await route.GET(
        new Request("http://localhost/api/prompts?take=100"),
      )
      const raw = await response.text()
      const payload: unknown = JSON.parse(raw)

      expect(response.status).toBe(200)
      expect(isRecord(payload)).toBe(true)
      if (!isRecord(payload) || !Array.isArray(payload.items)) {
        throw new Error("la route doit retourner une page items/nextCursor")
      }
      expect(payload.items).toHaveLength(69)
      const visibilities = payload.items.reduce<Record<string, number>>(
        (counts, item) => {
          if (!isRecord(item)) {
            throw new Error("chaque item doit être un objet")
          }
          const visibility = String(item.visibility)
          counts[visibility] = (counts[visibility] ?? 0) + 1
          return counts
        },
        {},
      )
      expect(visibilities).toEqual({ FREE: 20, PREMIUM: 49 })
      expect(payload.nextCursor).toBeNull()
      expect(raw).not.toMatch(/"body"|CORPS-SYNTHETIQUE/iu)
    },
  )

  it.each([
    ["anonyme", null],
    [
      "membre FREE",
      {
        expires: "2099-01-01T00:00:00.000Z",
        user: {
          email: "free-import@example.test",
          id: "free-import-user",
          membership: "FREE",
        },
      },
    ],
  ])(
    scenario(
      "Le détail premium importé ne fuit jamais son corps dans le JSON brut",
      "un acteur %s et un prompt PREMIUM issu d'un fichier synthétique avec une sentinelle unique",
      "GET /api/prompts/[slug] lit la session côté serveur puis sérialise la réponse",
      "la réponse 200 contient le teaser généré mais aucune clé body et aucun octet CORPS-SYNTHETIQUE",
    ),
    async (_actor, session) => {
      const imported = await db.prompt.findFirst({
        select: { body: true, slug: true },
        where: {
          slug: { startsWith: "business-prompt-" },
          visibility: "PREMIUM",
        },
      })
      if (!imported) {
        throw new Error("un prompt PREMIUM BUSINESS importé est requis")
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(session),
      }))
      const route = await loadRoute("@/app/api/prompts/[slug]/route")

      const response = await route.GET(
        new Request(`http://localhost/api/prompts/${imported.slug}`),
        { params: Promise.resolve({ slug: imported.slug }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(raw).not.toMatch(/"body"/u)
      expect(raw).not.toContain(imported.body)
      expect(raw).not.toMatch(/CORPS-SYNTHETIQUE/iu)
      expect(raw).toMatch(/"visibility":"PREMIUM"/u)
      expect(raw).toMatch(/"excerpt":/u)
    },
  )
})
