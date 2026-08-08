import { afterEach, describe, expect, it, vi } from "vitest"

type Membership = "FREE" | "PREMIUM"
type SessionUser = Readonly<{
  email: string
  id: string
  membership: Membership
}>

type PromptServiceModule = {
  getPromptBySlug: (slug: string, user: SessionUser | null) => Promise<unknown>
}

const PREMIUM_META = { visibility: "PREMIUM" } as const
const TEASER_ROW = {
  excerpt: "Un aperçu utile et volontairement public.",
  id: "prompt-premium",
  slug: "prompt-premium",
  summary: "Résumé public",
  tags: ["business", "ia"],
  title: "Prompt premium",
  visibility: "PREMIUM",
} as const
const FULL_ROW = {
  ...TEASER_ROW,
  body: "CORPS PREMIUM ULTRA SECRET",
} as const

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

function isPromptServiceModule(value: unknown): value is PromptServiceModule {
  return isRecord(value) && typeof value.getPromptBySlug === "function"
}

async function loadService(): Promise<PromptServiceModule> {
  const module: unknown = await import("@/server/services/prompt-service")
  if (!isPromptServiceModule(module)) {
    throw new Error("prompt-service doit exporter getPromptBySlug")
  }
  return module
}

function mockPremiumPrompt(entitled: boolean) {
  const findMetaBySlug = vi.fn().mockResolvedValue(PREMIUM_META)
  const findBySlug = vi
    .fn()
    .mockImplementation(
      (_slug: string, options: Readonly<{ includeBody: boolean }>) =>
        Promise.resolve(options.includeBody ? FULL_ROW : TEASER_ROW),
    )
  const canAccess = vi.fn().mockReturnValue(entitled)
  vi.doMock("@/server/repositories/prompt-repository", () => ({
    findBySlug,
    findMetaBySlug,
  }))
  vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
  return { canAccess, findBySlug, findMetaBySlug }
}

describe("service de détail d'un prompt gated", () => {
  afterEach(() => {
    vi.doUnmock("@/server/access/entitlement")
    vi.doUnmock("@/server/repositories/prompt-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Un visiteur anonyme reçoit le teaser éditorial sans que le corps soit demandé",
      "un prompt PREMIUM avec un excerpt distinct et aucune session",
      "le service charge le détail par son slug",
      "canAccess reçoit l'anonyme et la visibilité, le repository est rappelé avec includeBody false et le DTO retourné contient l'excerpt mais aucune clé body",
    ),
    async () => {
      const { canAccess, findBySlug, findMetaBySlug } = mockPremiumPrompt(false)
      const service = await loadService()

      const result = await service.getPromptBySlug("prompt-premium", null)

      expect(findMetaBySlug).toHaveBeenCalledWith("prompt-premium")
      expect(canAccess).toHaveBeenCalledWith(null, PREMIUM_META)
      expect(findBySlug).toHaveBeenCalledWith("prompt-premium", {
        includeBody: false,
      })
      expect(result).toEqual(TEASER_ROW)
      expect(Object.prototype.hasOwnProperty.call(result, "body")).toBe(false)
    },
  )

  it(
    scenario(
      "Un membre FREE reçoit exactement le même teaser verrouillé qu'un anonyme",
      "un prompt PREMIUM et une identité serveur dont membership vaut FREE",
      "le service charge le détail",
      "le repository ne charge pas body et le DTO contient seulement les champs publics, dont l'excerpt éditorial séparé",
    ),
    async () => {
      const { findBySlug } = mockPremiumPrompt(false)
      const service = await loadService()
      const user: SessionUser = {
        email: "free@example.test",
        id: "user-free",
        membership: "FREE",
      }

      const result = await service.getPromptBySlug("prompt-premium", user)

      expect(findBySlug).toHaveBeenCalledWith("prompt-premium", {
        includeBody: false,
      })
      expect(result).toEqual(TEASER_ROW)
      expect(JSON.stringify(result)).not.toContain(FULL_ROW.body)
    },
  )

  it(
    scenario(
      "Un membre PREMIUM reçoit le DTO complet après la décision centrale",
      "un prompt PREMIUM et une identité serveur dont membership vaut PREMIUM",
      "le service charge le détail",
      "canAccess autorise l'accès, le repository charge explicitement body et le DTO complet contient le corps",
    ),
    async () => {
      const { canAccess, findBySlug } = mockPremiumPrompt(true)
      const service = await loadService()
      const user: SessionUser = {
        email: "premium@example.test",
        id: "user-premium",
        membership: "PREMIUM",
      }

      const result = await service.getPromptBySlug("prompt-premium", user)

      expect(canAccess).toHaveBeenCalledWith(user, PREMIUM_META)
      expect(findBySlug).toHaveBeenCalledWith("prompt-premium", {
        includeBody: true,
      })
      expect(result).toEqual(FULL_ROW)
    },
  )

  it(
    scenario(
      "Un contenu FREE livre son corps même à un visiteur anonyme",
      "un prompt de visibilité FREE, son corps et aucune session",
      "le service charge le détail",
      "la décision centrale entraîne includeBody true et le DTO complet est retourné",
    ),
    async () => {
      const freeMeta = { visibility: "FREE" } as const
      const freeRow = {
        ...FULL_ROW,
        slug: "prompt-libre",
        visibility: "FREE",
      } as const
      const findMetaBySlug = vi.fn().mockResolvedValue(freeMeta)
      const findBySlug = vi.fn().mockResolvedValue(freeRow)
      const canAccess = vi.fn().mockReturnValue(true)
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
      const service = await loadService()

      const result = await service.getPromptBySlug("prompt-libre", null)

      expect(canAccess).toHaveBeenCalledWith(null, freeMeta)
      expect(findBySlug).toHaveBeenCalledWith("prompt-libre", {
        includeBody: true,
      })
      expect(result).toEqual(freeRow)
    },
  )

  it(
    scenario(
      "Un slug inconnu lève une erreur domaine avant toute lecture du corps",
      "un repository qui ne trouve aucune métadonnée pour le slug",
      "le service demande ce prompt absent",
      "il lève ContentNotFoundError et ne tente jamais la lecture conditionnelle du détail",
    ),
    async () => {
      const findMetaBySlug = vi.fn().mockResolvedValue(null)
      const findBySlug = vi.fn()
      vi.doMock("@/server/repositories/prompt-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn(),
      }))
      const service = await loadService()

      await expect(
        service.getPromptBySlug("prompt-inconnu", null),
      ).rejects.toMatchObject({ name: "ContentNotFoundError" })
      expect(findBySlug).not.toHaveBeenCalled()
    },
  )
})
