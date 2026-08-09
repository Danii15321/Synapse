import { afterEach, describe, expect, it, vi } from "vitest"

type MembershipService = Readonly<{
  grantPremium: (userId: string, source: string) => Promise<unknown>
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

function isGrantPremium(
  value: unknown,
): value is MembershipService["grantPremium"] {
  return typeof value === "function"
}

function serviceOf(value: Record<string, unknown>): MembershipService {
  if (isRecord(value.membershipService)) {
    const service = value.membershipService
    if (isGrantPremium(service.grantPremium)) {
      return { grantPremium: service.grantPremium }
    }
  }
  if (isGrantPremium(value.grantPremium)) {
    return { grantPremium: value.grantPremium }
  }
  throw new Error(
    "membership-service doit exposer membershipService.grantPremium(userId, source)",
  )
}

async function loadMembershipService(): Promise<MembershipService> {
  const modulePath = "@/server/services/membership-service"
  const module: unknown = await import(modulePath)
  if (!isRecord(module)) {
    throw new Error("membership-service doit être un module")
  }
  return serviceOf(module)
}

afterEach(() => {
  vi.doUnmock("@/server/repositories/membership-repository")
  vi.resetModules()
  vi.restoreAllMocks()
})

describe("service d'attribution premium", () => {
  it(
    scenario(
      "Une attribution explicite transmet l'utilisateur et la source au seul repository autorisé",
      "un userId issu de la commande d'administration et la source grant-premium-cli",
      "membershipService.grantPremium est appelé",
      "le repository reçoit exactement userId et source une seule fois, sans décision d'accès dans l'appelant",
    ),
    async () => {
      const grantPremium = vi.fn().mockResolvedValue({ granted: true })
      vi.doMock("@/server/repositories/membership-repository", () => ({
        grantPremium,
      }))
      const service = await loadMembershipService()

      await service.grantPremium("user-free-1", "grant-premium-cli")

      expect(grantPremium).toHaveBeenCalledOnce()
      expect(grantPremium).toHaveBeenCalledWith(
        "user-free-1",
        "grant-premium-cli",
      )
    },
  )
})
