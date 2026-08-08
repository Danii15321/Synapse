import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("secret serveur Auth.js", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it(
    scenario(
      "AUTH_SECRET est documenté avec une valeur factice et reste strictement serveur",
      "le fichier .env.example versionné et les sources de configuration",
      "les déclarations du secret Auth.js sont inspectées",
      "AUTH_SECRET possède un exemple factice d'au moins 32 caractères, aucune variante NEXT_PUBLIC_ n'existe et aucune valeur réelle n'est embarquée dans le code",
    ),
    () => {
      const envExample = source(".env.example")
      const secretLine = envExample
        .split(/\r?\n/)
        .find((line) => line.startsWith("AUTH_SECRET="))
      const exampleValue = secretLine?.slice("AUTH_SECRET=".length) ?? ""
      const configSource = source("src/server/config.ts")

      expect(secretLine).toBeDefined()
      expect(exampleValue.length).toBeGreaterThanOrEqual(32)
      expect(exampleValue).toMatch(/example|replace|change|dummy|fake/i)
      expect(envExample).not.toMatch(/NEXT_PUBLIC_AUTH_SECRET/)
      expect(configSource).toMatch(
        /AUTH_SECRET\s*:\s*process\.env\.AUTH_SECRET/,
      )
      expect(configSource).not.toMatch(/AUTH_SECRET\s*:\s*["'][^"']+["']/)
      expect(configSource).not.toMatch(/NEXT_PUBLIC_AUTH_SECRET/)
    },
  )

  it(
    scenario(
      "Le démarrage refuse un AUTH_SECRET absent ou trop court",
      "une DATABASE_URL valide mais aucun secret Auth.js exploitable",
      "src/server/config.ts est chargé avec un secret vide puis avec un secret court",
      "chaque import échoue immédiatement et nomme AUTH_SECRET avant toute requête",
    ),
    async () => {
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://synapse:example@localhost:5432/synapse",
      )
      vi.stubEnv("AUTH_SECRET", "")
      await expect(vi.importActual("@/server/config")).rejects.toThrow(
        /AUTH_SECRET/,
      )

      vi.resetModules()
      vi.stubEnv("AUTH_SECRET", "secret-trop-court")
      await expect(vi.importActual("@/server/config")).rejects.toThrow(
        /AUTH_SECRET/,
      )
    },
  )

  it(
    scenario(
      "La configuration valide expose AUTH_SECRET uniquement au serveur",
      "une DATABASE_URL valide et un secret Auth.js factice de 32 caractères ou plus",
      "src/server/config.ts parse les variables au chargement",
      "config contient AUTH_SECRET avec sa valeur exacte sans créer de clé NEXT_PUBLIC_",
    ),
    async () => {
      const authSecret = "replace-this-auth-secret-in-production-123456"
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://synapse:example@localhost:5432/synapse",
      )
      vi.stubEnv("AUTH_SECRET", authSecret)

      const module: unknown = await vi.importActual("@/server/config")

      expect(module).toEqual(
        expect.objectContaining({
          config: expect.objectContaining({ AUTH_SECRET: authSecret }),
        }),
      )
      expect(JSON.stringify(module)).not.toContain("NEXT_PUBLIC_AUTH_SECRET")
    },
  )
})
