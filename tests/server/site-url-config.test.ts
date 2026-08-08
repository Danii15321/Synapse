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

describe("URL canonique serveur", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it(
    scenario(
      "SITE_URL est documentée comme variable strictement serveur",
      "un clone frais configuré pour le développement local et la CI",
      ".env.example, le workflow et la configuration serveur sont inspectés",
      "SITE_URL vaut http://localhost:3000 en local et en CI, sans variante NEXT_PUBLIC_",
    ),
    () => {
      const envExample = source(".env.example")
      const workflow = source(".github/workflows/ci.yml")
      const config = source("src/server/config.ts")

      expect(envExample).toMatch(/^SITE_URL=http:\/\/localhost:3000$/m)
      expect(workflow).toMatch(/SITE_URL:\s*http:\/\/localhost:3000/)
      expect(config).toMatch(/SITE_URL\s*:\s*process\.env\.SITE_URL/)
      expect(`${envExample}\n${workflow}\n${config}`).not.toMatch(
        /NEXT_PUBLIC_SITE_URL/,
      )
    },
  )

  it(
    scenario(
      "Une URL canonique absolue est validée au démarrage",
      "les secrets requis et SITE_URL=https://synapse.example sont présents",
      "src/server/config.ts est chargé",
      "la configuration expose exactement cette URL absolue côté serveur",
    ),
    async () => {
      vi.stubEnv("AUTH_SECRET", "replace-this-test-secret-with-32-characters")
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://synapse:example@localhost:5432/synapse",
      )
      vi.stubEnv("SITE_URL", "https://synapse.example")

      const module: unknown = await vi.importActual("@/server/config")

      expect(module).toEqual(
        expect.objectContaining({
          config: expect.objectContaining({
            SITE_URL: "https://synapse.example",
          }),
        }),
      )
    },
  )

  it(
    scenario(
      "Une URL canonique absente ou relative bloque le démarrage",
      "les autres variables sont valides mais SITE_URL est vide puis relative",
      "src/server/config.ts est chargé dans chacun des deux cas",
      "chaque import échoue immédiatement et nomme SITE_URL",
    ),
    async () => {
      vi.stubEnv("AUTH_SECRET", "replace-this-test-secret-with-32-characters")
      vi.stubEnv(
        "DATABASE_URL",
        "postgresql://synapse:example@localhost:5432/synapse",
      )
      vi.stubEnv("SITE_URL", "")
      await expect(vi.importActual("@/server/config")).rejects.toThrow(
        /SITE_URL/,
      )

      vi.resetModules()
      vi.stubEnv("SITE_URL", "/synapse")
      await expect(vi.importActual("@/server/config")).rejects.toThrow(
        /SITE_URL/,
      )
    },
  )
})
