import { afterEach, describe, expect, it, vi } from "vitest"

function scenario(name: string, given: string, when: string, then: string): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

describe("validation de la configuration serveur", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it(
    scenario(
      "Le démarrage échoue immédiatement quand DATABASE_URL manque",
      "un processus sans variable DATABASE_URL",
      "src/server/config.ts est chargé",
      "l'import échoue avant toute requête et le message d'erreur nomme DATABASE_URL",
    ),
    async () => {
      vi.stubEnv("DATABASE_URL", "")
      vi.resetModules()

      await expect(import("@/server/config")).rejects.toThrow(/DATABASE_URL/)
    },
  )

  it(
    scenario(
      "La configuration valide est parsée au chargement du module",
      "une DATABASE_URL PostgreSQL valide",
      "src/server/config.ts est chargé",
      "le module expose la valeur validée sans lecture différée",
    ),
    async () => {
      const databaseUrl = "postgresql://synapse:example@localhost:5432/synapse"
      vi.stubEnv("DATABASE_URL", databaseUrl)
      vi.resetModules()

      const module = await import("@/server/config")

      expect(module.config).toMatchObject({ DATABASE_URL: databaseUrl })
    },
  )
})
