import { afterEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

type ErrorConstructor = new (...details: string[]) => Error

type ErrorMapping = {
  status: number
}

type ErrorModule = {
  ContentNotFoundError: ErrorConstructor
  NotEntitledError: ErrorConstructor
  RateLimitedError: ErrorConstructor
  ValidationError: ErrorConstructor
  mapDomainError: (error: unknown) => ErrorMapping
}

type LoggerModule = {
  writeLog: (entry: Record<string, unknown>) => void
}

type ValidationModule = {
  parseJsonBody: (
    request: Request,
    schema: z.ZodType<unknown>,
  ) => Promise<unknown>
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

function isErrorModule(value: unknown): value is ErrorModule {
  return (
    isRecord(value) &&
    typeof value.ContentNotFoundError === "function" &&
    typeof value.NotEntitledError === "function" &&
    typeof value.ValidationError === "function" &&
    typeof value.RateLimitedError === "function" &&
    typeof value.mapDomainError === "function"
  )
}

function isLoggerModule(value: unknown): value is LoggerModule {
  return isRecord(value) && typeof value.writeLog === "function"
}

function isValidationModule(value: unknown): value is ValidationModule {
  return isRecord(value) && typeof value.parseJsonBody === "function"
}

async function loadErrors(): Promise<ErrorModule> {
  const module: unknown = await vi.importActual("@/server/errors")
  if (!isErrorModule(module)) {
    throw new Error("server/errors doit exposer la hiérarchie et son mapping")
  }
  return module
}

async function loadLogger(): Promise<LoggerModule> {
  const module: unknown = await vi.importActual("@/server/logger")
  if (!isLoggerModule(module)) {
    throw new Error("server/logger doit exposer writeLog")
  }
  return module
}

async function loadValidation(): Promise<ValidationModule> {
  const module: unknown = await vi.importActual(
    "@/server/validation/parse-json-body",
  )
  if (!isValidationModule(module)) {
    throw new Error("le helper de validation doit exposer parseJsonBody")
  }
  return module
}

describe("erreurs domaine, journalisation et validation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it(
    scenario(
      "Chaque erreur domaine possède un statut HTTP centralisé sans enseigner HTTP aux services",
      "les quatre erreurs prévues par la tranche et une erreur interne inconnue",
      "le mapping central reçoit successivement chaque erreur",
      "ContentNotFound, NotEntitled, Validation et RateLimited donnent 404, 403, 400 et 429, tandis qu'une erreur inconnue donne 500",
    ),
    async () => {
      const errors = await loadErrors()
      const cases: Array<[Error, number]> = [
        [new errors.ContentNotFoundError("prompt", "introuvable"), 404],
        [new errors.NotEntitledError("prompt", "premium"), 403],
        [new errors.ValidationError("payload invalide"), 400],
        [new errors.RateLimitedError("60"), 429],
        [new Error("panne interne"), 500],
      ]

      for (const [error, status] of cases) {
        expect(error).toBeInstanceOf(Error)
        expect(errors.mapDomainError(error).status).toBe(status)
      }
    },
  )

  it(
    scenario(
      "Le logger écrit un JSON structuré sur stdout et rédige les champs sensibles à toute profondeur",
      "un événement contenant les métadonnées HTTP attendues, un mot de passe, des cookies, des tokens, un body premium et DATABASE_URL imbriqués",
      "l'événement est envoyé au logger unique",
      "stdout reçoit un JSON parseable avec errorId, route, méthode, statut et durée, tandis que chaque secret vaut [REDACTED] et aucune valeur secrète n'apparaît",
    ),
    async () => {
      const logger = await loadLogger()
      const write = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true)
      const secrets = {
        authorization: "Bearer secret-token",
        body: "CORPS_PREMIUM_ULTRA_SECRET",
        cookie: "authjs.session-token=session-secret",
        DATABASE_URL: "postgresql://user:password@database/private",
        password: "mot-de-passe-secret",
        token: "jeton-secret",
      }

      logger.writeLog({
        durationMs: 17,
        errorId: "4a8ddcc5-b2c8-47fd-b5e1-3deaae47b21b",
        method: "POST",
        request: {
          body: secrets.body,
          headers: {
            authorization: secrets.authorization,
            cookie: secrets.cookie,
          },
        },
        route: "/api/prompts",
        status: 500,
        token: secrets.token,
        user: { password: secrets.password },
        DATABASE_URL: secrets.DATABASE_URL,
      })

      const raw = write.mock.calls.map(([chunk]) => String(chunk)).join("")
      const parsed: unknown = JSON.parse(raw.trim())
      expect(isRecord(parsed)).toBe(true)
      if (!isRecord(parsed)) {
        throw new Error("le logger doit produire un objet JSON")
      }
      expect(parsed).toMatchObject({
        durationMs: 17,
        errorId: "4a8ddcc5-b2c8-47fd-b5e1-3deaae47b21b",
        method: "POST",
        route: "/api/prompts",
        status: 500,
      })
      for (const secret of Object.values(secrets)) {
        expect(raw).not.toContain(secret)
      }
      expect(raw.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(6)
    },
  )

  it(
    scenario(
      "Le helper JSON accepte un body conforme et retourne les données validées",
      "une requête JSON et un schéma Zod décrivant uniquement un nom court",
      "le body est parsé par le helper unique",
      "la valeur retournée est exactement l'objet validé",
    ),
    async () => {
      const validation = await loadValidation()
      const schema = z.object({ name: z.string().max(40) })
      const request = new Request("http://localhost/api/example", {
        body: JSON.stringify({ name: "Synapse" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })

      await expect(validation.parseJsonBody(request, schema)).resolves.toEqual({
        name: "Synapse",
      })
    },
  )

  it(
    scenario(
      "Le helper JSON rend tout schéma d'entrée strict même si un handler oublie strict()",
      "une requête JSON contenant un champ inconnu et un schéma Zod non rendu strict par l'appelant",
      "le body est parsé par le helper unique",
      "la promesse est rejetée avec ValidationError et le champ inconnu n'est pas silencieusement ignoré",
    ),
    async () => {
      const validation = await loadValidation()
      const schema = z.object({ name: z.string().max(40) })
      const request = new Request("http://localhost/api/example", {
        body: JSON.stringify({ admin: true, name: "Synapse" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })

      await expect(
        validation.parseJsonBody(request, schema),
      ).rejects.toMatchObject({ name: "ValidationError" })
    },
  )

  it(
    scenario(
      "Le helper transforme un JSON malformé en ValidationError exploitable",
      "une requête dont le content-type est JSON mais dont le body est tronqué",
      "le helper unique tente de parser le body",
      "la promesse est rejetée avec ValidationError sans exposer une SyntaxError brute au handler",
    ),
    async () => {
      const validation = await loadValidation()
      const schema = z.object({ name: z.string().max(40) })
      const request = new Request("http://localhost/api/example", {
        body: '{"name":',
        headers: { "content-type": "application/json" },
        method: "POST",
      })

      await expect(
        validation.parseJsonBody(request, schema),
      ).rejects.toMatchObject({ name: "ValidationError" })
    },
  )
})
