import { afterEach, describe, expect, it, vi } from "vitest"

type RateLimitServiceModule = {
  enforceRateLimit: (input: {
    identifier: string
    now: Date
    pathname: string
  }) => Promise<void>
}

type RecordHitInput = {
  identifier: string
  now: Date
  windowMs: number
}

type RecordHit = (input: RecordHitInput) => Promise<{
  count: number
  retryAfterSeconds: number
}>

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

function isRateLimitServiceModule(
  value: unknown,
): value is RateLimitServiceModule {
  return isRecord(value) && typeof value.enforceRateLimit === "function"
}

async function loadService(recordRateLimitHit: RecordHit) {
  vi.doMock("@/server/repositories/rate-limit-repository", () => ({
    purgeExpiredRateLimits: vi.fn().mockResolvedValue(0),
    recordRateLimitHit,
  }))
  const module: unknown = await vi.importActual(
    "@/server/services/rate-limit-service",
  )

  if (!isRateLimitServiceModule(module)) {
    throw new Error("rate-limit-service doit exposer enforceRateLimit")
  }

  return module
}

describe("régimes du rate limiting", () => {
  afterEach(() => {
    vi.doUnmock("@/server/repositories/rate-limit-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Une route générale accepte 60 requêtes par IP puis refuse la 61e",
      "un compteur PostgreSQL simulé qui progresse de 1 à 61 dans une fenêtre d'une minute",
      "la même IP appelle /api/prompts 61 fois",
      "les 60 premiers appels sont autorisés et le 61e lève RateLimitedError avec un Retry-After positif",
    ),
    async () => {
      let count = 0
      const recordRateLimitHit = vi.fn<RecordHit>(async () => ({
        count: (count += 1),
        retryAfterSeconds: 42,
      }))
      const service = await loadService(recordRateLimitHit)
      const input = {
        identifier: "ip:198.51.100.10",
        now: new Date("2026-08-07T12:00:00.000Z"),
        pathname: "/api/prompts",
      }

      for (let request = 1; request <= 60; request += 1) {
        await expect(service.enforceRateLimit(input)).resolves.toBeUndefined()
      }
      await expect(service.enforceRateLimit(input)).rejects.toMatchObject({
        name: "RateLimitedError",
        retryAfterSeconds: 42,
      })
      expect(recordRateLimitHit).toHaveBeenCalledTimes(61)
      expect(recordRateLimitHit.mock.calls[0]?.[0].windowMs).toBe(60_000)
    },
  )

  it(
    scenario(
      "Les routes d'authentification et d'inscription utilisent le seuil sensible de 10 requêtes",
      "un compteur PostgreSQL simulé et deux IP distinctes dans leur fenêtre courante",
      "chaque IP appelle 11 fois une route sensible, /api/auth/login puis /api/jeux/jeu-1/inscriptions",
      "10 appels par route sont autorisés et le 11e lève RateLimitedError",
    ),
    async () => {
      const counts = new Map<string, number>()
      const recordRateLimitHit = vi.fn<RecordHit>(async ({ identifier }) => {
        const count = (counts.get(identifier) ?? 0) + 1
        counts.set(identifier, count)
        return { count, retryAfterSeconds: 30 }
      })
      const service = await loadService(recordRateLimitHit)
      const routes = [
        ["ip:198.51.100.20", "/api/auth/login"],
        ["ip:198.51.100.21", "/api/jeux/jeu-1/inscriptions"],
      ]

      for (const [identifier, pathname] of routes) {
        if (!identifier || !pathname) {
          throw new Error("le scénario sensible doit définir IP et route")
        }
        for (let request = 1; request <= 10; request += 1) {
          await expect(
            service.enforceRateLimit({
              identifier,
              now: new Date("2026-08-07T12:00:00.000Z"),
              pathname,
            }),
          ).resolves.toBeUndefined()
        }
        await expect(
          service.enforceRateLimit({
            identifier,
            now: new Date("2026-08-07T12:00:00.000Z"),
            pathname,
          }),
        ).rejects.toMatchObject({ name: "RateLimitedError" })
      }
    },
  )

  it(
    scenario(
      "Une IP limitée redevient autorisée après l'expiration de la fenêtre",
      "un premier hit au-dessus du seuil puis un compteur revenu à 1 après plus d'une minute",
      "la même IP rappelle la route générale 61 secondes plus tard",
      "le premier appel lève RateLimitedError et le second est autorisé avec les deux instants transmis au repository",
    ),
    async () => {
      const recordRateLimitHit = vi
        .fn<RecordHit>()
        .mockResolvedValueOnce({ count: 61, retryAfterSeconds: 12 })
        .mockResolvedValueOnce({ count: 1, retryAfterSeconds: 60 })
      const service = await loadService(recordRateLimitHit)
      const first = new Date("2026-08-07T12:00:00.000Z")
      const afterWindow = new Date(first.getTime() + 61_000)

      await expect(
        service.enforceRateLimit({
          identifier: "ip:203.0.113.5",
          now: first,
          pathname: "/api/prompts",
        }),
      ).rejects.toMatchObject({ name: "RateLimitedError" })
      await expect(
        service.enforceRateLimit({
          identifier: "ip:203.0.113.5",
          now: afterWindow,
          pathname: "/api/prompts",
        }),
      ).resolves.toBeUndefined()

      expect(recordRateLimitHit.mock.calls[0]?.[0].now).toEqual(first)
      expect(recordRateLimitHit.mock.calls[1]?.[0].now).toEqual(afterWindow)
    },
  )
})
