import { afterEach, describe, expect, it, vi } from "vitest"

type PromptsRouteModule = {
  GET: () => Response | Promise<Response>
}

type PromptsApiModule = {
  getPrompts: () => Promise<unknown>
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

function isPromptsRouteModule(value: unknown): value is PromptsRouteModule {
  return isRecord(value) && typeof value.GET === "function"
}

function isPromptsApiModule(value: unknown): value is PromptsApiModule {
  return isRecord(value) && typeof value.getPrompts === "function"
}

describe("BFF de liste des prompts", () => {
  afterEach(() => {
    vi.doUnmock("@/server/services/prompt-service")
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it(
    scenario(
      "GET /api/prompts sérialise la liste du service",
      "un service qui retourne deux DTO prompts",
      "le Route Handler reçoit une requête GET",
      "la réponse HTTP brute vaut 200, annonce du JSON et contient exactement le tableau au bon format",
    ),
    async () => {
      const prompts = [
        {
          id: "prompt-1",
          slug: "premier-prompt",
          summary: "Premier résumé",
          title: "Premier prompt",
        },
        {
          id: "prompt-2",
          slug: "deuxieme-prompt",
          summary: "Deuxième résumé",
          title: "Deuxième prompt",
        },
      ]
      const getPrompts = vi.fn().mockResolvedValue(prompts)
      vi.doMock("@/server/services/prompt-service", () => ({ getPrompts }))
      const module: unknown = await import("@/app/api/prompts/route")
      if (!isPromptsRouteModule(module)) {
        throw new Error("la route prompts doit exporter GET")
      }

      const response = await module.GET()
      const rawBody = await response.text()

      expect(getPrompts).toHaveBeenCalledTimes(1)
      expect(response.status).toBe(200)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(JSON.parse(rawBody)).toEqual(prompts)
    },
  )

  it(
    scenario(
      "Le client partagé demande la liste au Route Handler public",
      "une réponse HTTP brute 200 contenant un tableau de DTO prompts",
      "getPrompts est appelé depuis le client",
      "un unique fetch cible /api/prompts et la fonction retourne le JSON reçu",
    ),
    async () => {
      const prompts = [
        {
          id: "prompt-1",
          slug: "premier-prompt",
          summary: "Premier résumé",
          title: "Premier prompt",
        },
      ]
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(prompts, { status: 200 }))
      vi.stubGlobal("fetch", fetchMock)
      const module: unknown = await import("@/lib/api")
      if (!isPromptsApiModule(module)) {
        throw new Error("lib/api.ts doit exporter getPrompts")
      }

      const result = await module.getPrompts()

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/prompts")
      expect(result).toEqual(prompts)
    },
  )
})
