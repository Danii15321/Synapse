import { afterEach, describe, expect, it, vi } from "vitest"

type DetailRouteModule = {
  GET: (
    request: Request,
    context: Readonly<{ params: Promise<Record<string, unknown>> }>,
  ) => Promise<Response> | Response
}

type ContentNotFoundErrorConstructor = new (
  resource: string,
  identifier: string,
) => Error

const TEASER = {
  excerpt: "Extrait éditorial public",
  id: "prompt-premium",
  slug: "prompt-premium",
  summary: "Résumé public",
  tags: ["business", "ia"],
  title: "Prompt premium",
  visibility: "PREMIUM",
} as const
const FULL = { ...TEASER, body: "CORPS PREMIUM SENTINELLE" } as const

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isDetailRouteModule(value: unknown): value is DetailRouteModule {
  return isRecord(value) && typeof value.GET === "function"
}

function isContentNotFoundErrorConstructor(
  value: unknown,
): value is ContentNotFoundErrorConstructor {
  return typeof value === "function"
}

async function loadRoute(): Promise<DetailRouteModule> {
  const modulePath = "@/app/api/prompts/[slug]/route"
  const module: unknown = await vi.importActual(modulePath)
  if (!isDetailRouteModule(module)) {
    throw new Error("GET /api/prompts/[slug] doit exporter GET")
  }
  return module
}

function request() {
  return new Request("http://localhost/api/prompts/prompt-premium", {
    method: "GET",
  })
}

function context(params: Record<string, unknown> = { slug: "prompt-premium" }) {
  return { params: Promise.resolve(params) }
}

describe("Route Handler du détail premium", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/config")
    vi.doUnmock("@/server/services/prompt-service")
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it(
    scenario(
      "Le JSON HTTP brut d'un visiteur anonyme contient le teaser mais aucune clé body",
      "Auth.js ne retourne aucune session et le service retourne un PromptTeaser PREMIUM",
      "GET /api/prompts/[slug] est invoqué directement",
      "la réponse 200 contient titre, résumé, tags, badge de visibilité et excerpt, tandis que body et sa sentinelle sont absents du texte brut",
    ),
    async () => {
      const auth = vi.fn().mockResolvedValue(null)
      const getPromptBySlug = vi.fn().mockResolvedValue(TEASER)
      vi.doMock("@/server/auth/config", () => ({ auth }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug,
      }))
      const route = await loadRoute()

      const response = await route.GET(request(), context())
      const rawBody = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(JSON.parse(rawBody)).toEqual(TEASER)
      expect(rawBody).not.toMatch(/"body"/)
      expect(rawBody).not.toContain(FULL.body)
      expect(getPromptBySlug).toHaveBeenCalledWith("prompt-premium", null)
    },
  )

  it(
    scenario(
      "Le JSON HTTP brut d'un membre FREE ne contient jamais le corps premium",
      "une session serveur FREE valide et un PromptTeaser PREMIUM",
      "le handler lit la session puis appelle le service",
      "l'identité issue de la session est transmise au service et la réponse brute ne possède aucune clé body",
    ),
    async () => {
      const user = {
        email: "free@example.test",
        id: "user-free",
        membership: "FREE",
      } as const
      const auth = vi.fn().mockResolvedValue({
        expires: "2099-01-01T00:00:00.000Z",
        user,
      })
      const getPromptBySlug = vi.fn().mockResolvedValue(TEASER)
      vi.doMock("@/server/auth/config", () => ({ auth }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug,
      }))
      const route = await loadRoute()

      const response = await route.GET(request(), context())
      const rawBody = await response.text()

      expect(response.status).toBe(200)
      expect(getPromptBySlug).toHaveBeenCalledWith("prompt-premium", user)
      expect(JSON.parse(rawBody)).toEqual(TEASER)
      expect(rawBody).not.toMatch(/"body"/)
      expect(rawBody).not.toContain(FULL.body)
    },
  )

  it(
    scenario(
      "Le JSON HTTP brut d'un membre PREMIUM contient le corps complet",
      "une session serveur PREMIUM valide et un PromptFull autorisé par le service",
      "GET /api/prompts/[slug] est appelé",
      "la réponse 200 sérialise exactement le DTO complet avec body",
    ),
    async () => {
      const user = {
        email: "premium@example.test",
        id: "user-premium",
        membership: "PREMIUM",
      } as const
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user,
        }),
      }))
      const getPromptBySlug = vi.fn().mockResolvedValue(FULL)
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug,
      }))
      const route = await loadRoute()

      const response = await route.GET(request(), context())
      const rawBody = await response.text()

      expect(response.status).toBe(200)
      expect(getPromptBySlug).toHaveBeenCalledWith("prompt-premium", user)
      expect(JSON.parse(rawBody)).toEqual(FULL)
      expect(rawBody).toContain(FULL.body)
    },
  )

  it(
    scenario(
      "Un prompt absent produit une erreur HTTP générique sans fuite",
      "un service qui lève ContentNotFoundError avec le slug interne",
      "le Route Handler traite la lecture",
      "la réponse brute vaut 404, contient un errorId UUID et ne révèle ni slug, ni stack, ni détail Prisma",
    ),
    async () => {
      const errorsModule: unknown = await vi.importActual("@/server/errors")
      if (
        !isRecord(errorsModule) ||
        !isContentNotFoundErrorConstructor(errorsModule.ContentNotFoundError)
      ) {
        throw new Error(
          "server/errors doit exporter la classe ContentNotFoundError",
        )
      }
      const notFoundError = new errorsModule.ContentNotFoundError(
        "prompt",
        "prompt-inconnu",
      )
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockRejectedValue(notFoundError),
      }))
      const route = await loadRoute()

      const response = await route.GET(
        new Request("http://localhost/api/prompts/prompt-inconnu"),
        context({ slug: "prompt-inconnu" }),
      )
      const rawBody = await response.text()
      const payload: unknown = JSON.parse(rawBody)

      expect(response.status).toBe(404)
      expect(isRecord(payload)).toBe(true)
      if (!isRecord(payload)) {
        throw new Error("l'erreur doit être un objet JSON")
      }
      expect(payload.errorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
      expect(rawBody).not.toMatch(/prompt-inconnu|Prisma|stack/i)
    },
  )

  it(
    scenario(
      "Les paramètres de route sont validés par un schéma Zod strict",
      "un contexte de route qui contient un slug valide plus un membership forgé",
      "le Route Handler parse la frontière sans aide du routeur Next",
      "la réponse brute vaut 400 et le service n'est jamais appelé",
    ),
    async () => {
      const getPromptBySlug = vi.fn()
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug,
      }))
      const route = await loadRoute()

      const response = await route.GET(
        request(),
        context({ membership: "PREMIUM", slug: "prompt-premium" }),
      )

      expect(response.status).toBe(400)
      expect(getPromptBySlug).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Une erreur interne ne journalise jamais le corps premium",
      "un service défaillant dont l'erreur contient accidentellement la sentinelle du body",
      "le Route Handler génère sa réponse générique et son log structuré",
      "ni les octets HTTP, ni stdout, ni stderr ne contiennent le corps verrouillé ou une stack envoyée au client",
    ),
    async () => {
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi
          .fn()
          .mockRejectedValue(new Error(`échec ${FULL.body}`)),
      }))
      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true)
      const stderr = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true)
      const route = await loadRoute()

      const response = await route.GET(request(), context())
      const rawBody = await response.text()
      const logs = [...stdout.mock.calls, ...stderr.mock.calls]
        .map(([chunk]) => String(chunk))
        .join("")

      expect(response.status).toBe(500)
      expect(rawBody).not.toContain(FULL.body)
      expect(rawBody).not.toMatch(/stack/i)
      expect(logs).not.toContain(FULL.body)
    },
  )
})
