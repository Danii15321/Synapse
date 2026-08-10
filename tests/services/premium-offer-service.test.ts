import { afterEach, describe, expect, it, vi } from "vitest"

type PremiumCounts = Readonly<{
  formations: number
  jeux: number
  opportunites: number
  prompts: number
}>

type PremiumOfferService = Readonly<{
  getPremiumOffer: () => Promise<unknown>
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

function isGetPremiumOffer(
  value: unknown,
): value is PremiumOfferService["getPremiumOffer"] {
  return typeof value === "function"
}

async function loadPremiumOfferService(): Promise<PremiumOfferService> {
  const modulePath = "@/server/services/premium-offer-service"
  const module: unknown = await import(modulePath)
  if (!isRecord(module) || !isGetPremiumOffer(module.getPremiumOffer)) {
    throw new Error(
      "premium-offer-service doit exposer getPremiumOffer sans connaître HTTP",
    )
  }
  return { getPremiumOffer: module.getPremiumOffer }
}

afterEach(() => {
  vi.doUnmock("@/server/repositories/premium-offer-repository")
  vi.resetModules()
  vi.restoreAllMocks()
})

describe("service de l'offre premium", () => {
  it(
    scenario(
      "Les volumes réels et le prix unique construisent l'état success de l'offre",
      "un repository qui retourne quatre volumes distincts de contenus publiés",
      "le service construit le DTO public de /premium",
      "les quatre volumes restent associés à leur rubrique et le prix vaut 7 550 FCFA en paiement unique",
    ),
    async () => {
      const counts: PremiumCounts = {
        formations: 12,
        jeux: 7,
        opportunites: 19,
        prompts: 31,
      }
      const getPremiumContentCounts = vi.fn().mockResolvedValue(counts)
      vi.doMock("@/server/repositories/premium-offer-repository", () => ({
        getPremiumContentCounts,
      }))
      const service = await loadPremiumOfferService()

      const result = await service.getPremiumOffer()

      expect(getPremiumContentCounts).toHaveBeenCalledOnce()
      expect(result).toEqual(
        expect.objectContaining({
          counts,
          price: expect.objectContaining({ amount: 7_550, currency: "XOF" }),
        }),
      )
    },
  )

  it(
    scenario(
      "Des rubriques sans contenu restent un état vide explicite sans volumes inventés",
      "un repository qui retourne zéro pour les quatre rubriques",
      "le service construit l'offre publique",
      "le DTO conserve quatre zéros et permet à l'écran d'annoncer honnêtement l'absence de volume",
    ),
    async () => {
      const counts: PremiumCounts = {
        formations: 0,
        jeux: 0,
        opportunites: 0,
        prompts: 0,
      }
      vi.doMock("@/server/repositories/premium-offer-repository", () => ({
        getPremiumContentCounts: vi.fn().mockResolvedValue(counts),
      }))
      const service = await loadPremiumOfferService()

      const result = await service.getPremiumOffer()

      expect(result).toEqual(expect.objectContaining({ counts }))
    },
  )
})
