import { afterEach, describe, expect, it, vi } from "vitest"

import { scenario } from "../repositories/replicated-content-fixtures"

type SessionUser = Readonly<{
  email: string
  id: string
  membership: "FREE" | "PREMIUM"
}>

type GetDetail = (slug: string, user: SessionUser | null) => Promise<unknown>
type GetList = (query: Readonly<Record<string, unknown>>) => Promise<unknown>

type FormationService = Readonly<{
  getFormationBySlug: GetDetail
  getFormations: GetList
}>

type OpportuniteService = Readonly<{
  getOpportuniteBySlug: GetDetail
  getOpportunites: GetList
}>

const NON_ENTITLED_ACTORS: ReadonlyArray<
  readonly [string, SessionUser | null]
> = [
  ["anonyme", null],
  [
    "membre FREE",
    { email: "free@example.test", id: "free", membership: "FREE" },
  ],
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFormationService(value: unknown): value is FormationService {
  return (
    isRecord(value) &&
    typeof value.getFormations === "function" &&
    typeof value.getFormationBySlug === "function"
  )
}

function isOpportuniteService(value: unknown): value is OpportuniteService {
  return (
    isRecord(value) &&
    typeof value.getOpportunites === "function" &&
    typeof value.getOpportuniteBySlug === "function"
  )
}

async function loadFormationService(): Promise<FormationService> {
  const module: unknown = await import("@/server/services/formation-service")
  if (!isFormationService(module)) {
    throw new Error("formation-service doit exposer liste et détail")
  }
  return module
}

async function loadOpportuniteService(): Promise<OpportuniteService> {
  const module: unknown = await import("@/server/services/opportunite-service")
  if (!isOpportuniteService(module)) {
    throw new Error("opportunite-service doit exposer liste et détail")
  }
  return module
}

afterEach(() => {
  vi.doUnmock("@/server/access/entitlement")
  vi.doUnmock("@/server/repositories/formation-repository")
  vi.doUnmock("@/server/repositories/opportunite-repository")
  vi.resetModules()
})

describe("services des rubriques répliquées", () => {
  it.each([
    ["PERMANENTE", null],
    ["EVENEMENTIELLE", "2026-12-12T10:00:00.000Z"],
  ])(
    scenario(
      "Nature et visibilité d'une formation restent orthogonales",
      "une formation %s PREMIUM avec startsAt %s et un utilisateur non entitled",
      "le service charge le détail",
      "canAccess décide uniquement depuis visibility, le repository reçoit includeBody false et le teaser conserve kind sans body",
    ),
    async (kind, startsAt) => {
      const meta = { visibility: "PREMIUM" }
      const repositoryStartsAt = startsAt ? new Date(startsAt) : null
      const teaser = {
        coverImage: null,
        durationH: 3,
        excerpt: "Extrait public",
        format: "EN_LIGNE",
        id: `formation-${kind}`,
        kind,
        level: "DEBUTANT",
        slug: `formation-${kind}`,
        startsAt: repositoryStartsAt,
        summary: "Résumé public",
        title: "Formation premium",
        visibility: "PREMIUM",
      }
      const findMetaBySlug = vi.fn().mockResolvedValue(meta)
      const findBySlug = vi.fn().mockResolvedValue(teaser)
      const canAccess = vi.fn().mockReturnValue(false)
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
      const service = await loadFormationService()

      const result = await service.getFormationBySlug(teaser.slug, null)

      expect(canAccess).toHaveBeenCalledWith(null, meta)
      expect(findBySlug).toHaveBeenCalledWith(teaser.slug, {
        includeBody: false,
      })
      expect(result).toEqual({ ...teaser, startsAt })
      expect(Object.prototype.hasOwnProperty.call(result, "body")).toBe(false)
    },
  )

  it(
    scenario(
      "Une formation FREE livre son contenu sans inscription quelle que soit sa nature",
      "une formation permanente FREE et un visiteur anonyme",
      "le service charge le détail",
      "la décision centrale autorise body, le DTO complet ne contient aucun identifiant ni état d'inscription",
    ),
    async () => {
      const meta = { visibility: "FREE" }
      const full = {
        body: "Programme complet",
        coverImage: null,
        durationH: 2,
        excerpt: "Extrait public",
        format: "EN_LIGNE",
        id: "formation-libre",
        kind: "PERMANENTE",
        level: "INTERMEDIAIRE",
        slug: "formation-libre",
        startsAt: null,
        summary: "Résumé public",
        title: "Formation libre",
        visibility: "FREE",
      }
      const findMetaBySlug = vi.fn().mockResolvedValue(meta)
      const findBySlug = vi.fn().mockResolvedValue(full)
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadFormationService()

      const result = await service.getFormationBySlug(full.slug, null)

      expect(findBySlug).toHaveBeenCalledWith(full.slug, { includeBody: true })
      expect(result).toEqual(full)
      expect(JSON.stringify(result)).not.toMatch(
        /inscription|registration|userId/i,
      )
    },
  )

  it.each(NON_ENTITLED_ACTORS)(
    scenario(
      "Le teaser d'une opportunité premium exclut tous ses champs verrouillés",
      "une opportunité PREMIUM et un %s",
      "le service charge le détail",
      "le repository reçoit includeLockedFields false et le DTO ne contient ni body ni externalUrl",
    ),
    async (_actor, user) => {
      const meta = { visibility: "PREMIUM" }
      const deadline = "2026-12-31T23:59:59.000Z"
      const teaser = {
        coverImage: null,
        deadline: new Date(deadline),
        excerpt: "Extrait public",
        id: "opportunite-premium",
        organisme: "Synapse",
        slug: "opportunite-premium",
        summary: "Résumé public",
        title: "Opportunité premium",
        type: "FINANCEMENT",
        visibility: "PREMIUM",
      }
      const findMetaBySlug = vi.fn().mockResolvedValue(meta)
      const findBySlug = vi.fn().mockResolvedValue(teaser)
      vi.doMock("@/server/repositories/opportunite-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(false),
      }))
      const service = await loadOpportuniteService()

      const result = await service.getOpportuniteBySlug(teaser.slug, user)

      expect(findBySlug).toHaveBeenCalledWith(teaser.slug, {
        includeLockedFields: false,
      })
      expect(result).toEqual({ ...teaser, deadline })
      expect(JSON.stringify(result)).not.toMatch(/body|externalUrl/)
    },
  )

  it(
    scenario(
      "Un membre PREMIUM reçoit ensemble le corps et le lien de candidature",
      "une opportunité PREMIUM et une identité PREMIUM vérifiée",
      "le service charge le détail après canAccess",
      "le repository reçoit includeLockedFields true et le DTO contient body et externalUrl intacts",
    ),
    async () => {
      const user: SessionUser = {
        email: "premium@example.test",
        id: "premium",
        membership: "PREMIUM",
      }
      const meta = { visibility: "PREMIUM" }
      const full = {
        body: "Dossier complet",
        coverImage: null,
        deadline: new Date("2026-12-31T23:59:59.000Z"),
        excerpt: "Extrait public",
        externalUrl: "https://candidature.example.test",
        id: "opportunite-premium",
        organisme: "Synapse",
        slug: "opportunite-premium",
        summary: "Résumé public",
        title: "Opportunité premium",
        type: "FINANCEMENT",
        visibility: "PREMIUM",
      }
      const findMetaBySlug = vi.fn().mockResolvedValue(meta)
      const findBySlug = vi.fn().mockResolvedValue(full)
      vi.doMock("@/server/repositories/opportunite-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadOpportuniteService()

      const result = await service.getOpportuniteBySlug(full.slug, user)

      expect(findBySlug).toHaveBeenCalledWith(full.slug, {
        includeLockedFields: true,
      })
      expect(result).toEqual({
        ...full,
        deadline: "2026-12-31T23:59:59.000Z",
      })
    },
  )

  it(
    scenario(
      "Les services rejettent toute row repository incomplète à la frontière Zod",
      "une row sans coverImage ni les autres champs obligatoires renvoyée en liste puis en détail par les deux repositories",
      "les services Formations et Opportunités tentent de construire leurs DTO",
      "les quatre appels liste Formation, détail Formation, liste Opportunité et détail Opportunité sont rejetés par Zod",
    ),
    async () => {
      const incompleteRow = {
        id: "row-incomplete",
        slug: "row-incomplete",
        visibility: "FREE",
      }
      const incompleteRepository = {
        findBySlug: vi.fn().mockResolvedValue(incompleteRow),
        findMany: vi.fn().mockResolvedValue([incompleteRow]),
        findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "FREE" }),
      }
      vi.doMock(
        "@/server/repositories/formation-repository",
        () => incompleteRepository,
      )
      vi.doMock(
        "@/server/repositories/opportunite-repository",
        () => incompleteRepository,
      )
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const formationService = await loadFormationService()
      const opportuniteService = await loadOpportuniteService()

      const outcomes = await Promise.allSettled([
        formationService.getFormations({ take: 1 }),
        formationService.getFormationBySlug(incompleteRow.slug, null),
        opportuniteService.getOpportunites({ take: 1 }),
        opportuniteService.getOpportuniteBySlug(incompleteRow.slug, null),
      ])

      expect(outcomes.map(({ status }) => status)).toEqual([
        "rejected",
        "rejected",
        "rejected",
        "rejected",
      ])
      for (const outcome of outcomes) {
        if (outcome.status === "rejected") {
          expect(outcome.reason).toMatchObject({ name: "ZodError" })
        }
      }
    },
  )
})
