import { afterEach, describe, expect, it, vi } from "vitest"

type PromptsRouteModule = {
  GET: (request: Request) => Response | Promise<Response>
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

function parseLogLines(raw: string): Array<Record<string, unknown>> {
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line))
    .filter(isRecord)
}

describe("réponses d'erreur HTTP sans fuite", () => {
  afterEach(() => {
    vi.doUnmock("@/server/services/prompt-service")
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it(
    scenario(
      "Une exception Prisma devient une réponse générique corrélée à un log serveur",
      "le service Prompts qui lève une erreur contenant un nom de table, une stack trace et DATABASE_URL",
      "GET /api/prompts est appelé avec une requête HTTP brute",
      "la réponse vaut 500 avec seulement un message générique et un errorId UUID, tandis qu'un JSON stdout de même errorId contient les métadonnées HTTP et le détail utile sans DATABASE_URL",
    ),
    async () => {
      const databaseUrl = "postgresql://admin:secret@database/private"
      const internalMessage =
        'Invalid prisma.prompt.findMany invocation: relation "PromptSecret" does not exist'
      const internalError = new Error(internalMessage)
      internalError.stack = `${internalMessage}\n    at repository.ts:42\nDATABASE_URL=${databaseUrl}`
      vi.doMock("@/server/services/prompt-service", () => ({
        getPrompts: vi.fn().mockRejectedValue(internalError),
      }))
      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true)
      const module: unknown = await import("@/app/api/prompts/route")
      if (!isPromptsRouteModule(module)) {
        throw new Error("la route prompts doit exporter GET")
      }

      const response = await module.GET(
        new Request("http://localhost/api/prompts", { method: "GET" }),
      )
      const rawBody = await response.text()
      const payload: unknown = JSON.parse(rawBody)

      expect(response.status).toBe(500)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(isRecord(payload)).toBe(true)
      if (!isRecord(payload)) {
        throw new Error("la réponse d'erreur doit être un objet JSON")
      }
      expect(Object.keys(payload).sort()).toEqual(["errorId", "message"])
      expect(payload.message).toEqual(expect.any(String))
      expect(payload.errorId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      )
      for (const leaked of [
        "Prisma",
        "PromptSecret",
        "repository.ts",
        "DATABASE_URL",
        databaseUrl,
        "stack",
      ]) {
        expect(rawBody).not.toContain(leaked)
      }

      const rawLogs = stdout.mock.calls.map(([chunk]) => String(chunk)).join("")
      const matchingLog = parseLogLines(rawLogs).find(
        (entry) => entry.errorId === payload.errorId,
      )
      expect(matchingLog).toMatchObject({
        errorId: payload.errorId,
        method: "GET",
        route: "/api/prompts",
        status: 500,
      })
      expect(matchingLog?.durationMs).toEqual(expect.any(Number))
      expect(rawLogs).toContain("PromptSecret")
      expect(rawLogs).not.toContain(databaseUrl)
    },
  )
})
