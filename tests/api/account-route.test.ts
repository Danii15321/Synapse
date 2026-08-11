import { afterEach, describe, expect, it, vi } from "vitest"

type AccountRouteModule = {
  GET: (request: Request) => Promise<Response> | Response
}

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

function isAccountRouteModule(value: unknown): value is AccountRouteModule {
  return isRecord(value) && typeof value.GET === "function"
}

describe("Route Handler protégé du compte", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/require-user")
    vi.doUnmock("@/server/services/auth-service")
    vi.resetModules()
  })

  it(
    scenario(
      "GET /api/auth/account refuse un appel direct sans session même quand le middleware est contourné",
      "un appel HTTP brut sans cookie adressé directement au Route Handler protégé du compte",
      "GET est invoqué comme une fonction sans exécuter middleware.ts",
      "requireUser est appelé dans le handler, la réponse brute vaut 401 avec une erreur générique et le service compte n'est jamais appelé",
    ),
    async () => {
      const requireUser = vi.fn().mockRejectedValue(
        Object.assign(new Error("session absente"), {
          name: "UnauthorizedError",
        }),
      )
      const getAccount = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/services/auth-service", () => ({
        deleteAccount: vi.fn(),
        getAccount,
        updateProfile: vi.fn(),
      }))
      const module: unknown = await vi.importActual(
        "@/app/api/auth/account/route",
      )
      if (!isAccountRouteModule(module)) {
        throw new Error("GET /api/auth/account doit exporter GET")
      }

      const response = await module.GET(
        new Request("http://localhost/api/auth/account", { method: "GET" }),
      )
      const rawBody = await response.text()
      const payload: unknown = JSON.parse(rawBody)

      expect(requireUser).toHaveBeenCalledTimes(1)
      expect(getAccount).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(isRecord(payload)).toBe(true)
      expect(rawBody).not.toMatch(/session absente|stack|Prisma|DATABASE_URL/i)
    },
  )
})
