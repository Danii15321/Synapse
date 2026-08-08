import { describe, expect, it, vi } from "vitest"

type Membership = "FREE" | "PREMIUM"
type Visibility = "FREE" | "PREMIUM"

type SessionUser = Readonly<{
  email: string
  id: string
  membership: Membership
}>

type EntitlementModule = {
  canAccess: (
    user: SessionUser | null,
    content: Readonly<{ visibility: Visibility }>,
  ) => boolean
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

function isEntitlementModule(value: unknown): value is EntitlementModule {
  return isRecord(value) && typeof value.canAccess === "function"
}

describe("point unique de vérité de l'accès premium", () => {
  it(
    scenario(
      "La matrice d'entitlement autorise le libre et réserve le premium aux membres PREMIUM",
      "un visiteur anonyme, un membre FREE, un membre PREMIUM et deux contenus de visibilité différente",
      "le point unique canAccess décide l'accès pour chaque combinaison pertinente",
      "le contenu FREE est accessible à tous, tandis que le contenu PREMIUM est refusé à l'anonyme et au membre FREE mais accordé au membre PREMIUM",
    ),
    async () => {
      const modulePath = "@/server/access/entitlement"
      const module: unknown = await vi.importActual(modulePath)
      if (!isEntitlementModule(module)) {
        throw new Error("server/access/entitlement doit exporter canAccess")
      }
      const freeUser: SessionUser = {
        email: "free@example.test",
        id: "user-free",
        membership: "FREE",
      }
      const premiumUser: SessionUser = {
        email: "premium@example.test",
        id: "user-premium",
        membership: "PREMIUM",
      }

      expect(module.canAccess(null, { visibility: "FREE" })).toBe(true)
      expect(module.canAccess(freeUser, { visibility: "FREE" })).toBe(true)
      expect(module.canAccess(null, { visibility: "PREMIUM" })).toBe(false)
      expect(module.canAccess(freeUser, { visibility: "PREMIUM" })).toBe(false)
      expect(module.canAccess(premiumUser, { visibility: "PREMIUM" })).toBe(
        true,
      )
    },
  )
})
