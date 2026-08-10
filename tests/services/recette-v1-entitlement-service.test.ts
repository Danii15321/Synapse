import { afterEach, describe, expect, it, vi } from "vitest"

import {
  expectReleaseEvidence,
  releaseEvidence,
  scenario,
} from "../fixtures/recette-v1-test-utils"

type Membership = "FREE" | "PREMIUM"
type SessionUser = Readonly<{
  email: string
  id: string
  membership: Membership
}>

type ServiceAudit = Readonly<{
  lockedFields: readonly string[]
  result: unknown
}>

const ACTORS = [
  { label: "visiteur anonyme", user: null },
  {
    label: "membre FREE",
    user: {
      email: "free-recette@example.test",
      id: "free-recette",
      membership: "FREE",
    } satisfies SessionUser,
  },
] as const

async function auditPrompt(user: SessionUser | null): Promise<ServiceAudit> {
  const findBySlug = vi.fn().mockResolvedValue({
    coverImage: null,
    domain: "ia",
    excerpt: "EXTRAIT-PUBLIC-PROMPT",
    id: "prompt-premium",
    slug: "prompt-premium",
    summary: "Résumé public",
    tags: ["intelligence-artificielle", "productivité"],
    title: "Prompt premium",
    visibility: "PREMIUM",
  })
  vi.doMock("@/server/repositories/prompt-repository", () => ({
    findBySlug,
    findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "PREMIUM" }),
  }))
  vi.doMock("@/server/access/entitlement", () => ({
    canAccess: vi.fn().mockReturnValue(false),
  }))
  const service = await import("@/server/services/prompt-service")
  const result = await service.getPromptBySlug("prompt-premium", user)
  expect(findBySlug).toHaveBeenCalledWith("prompt-premium", {
    includeBody: false,
  })
  return { lockedFields: ["body"], result }
}

async function auditFormation(user: SessionUser | null): Promise<ServiceAudit> {
  const findBySlug = vi.fn().mockResolvedValue({
    coverImage: null,
    durationH: 2,
    excerpt: "EXTRAIT-PUBLIC-FORMATION",
    format: "EN_LIGNE",
    id: "formation-premium",
    kind: "PERMANENTE",
    level: "DEBUTANT",
    slug: "formation-premium",
    startsAt: null,
    summary: "Résumé public",
    title: "Formation premium",
    visibility: "PREMIUM",
  })
  vi.doMock("@/server/repositories/formation-repository", () => ({
    findBySlug,
    findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "PREMIUM" }),
  }))
  vi.doMock("@/server/access/entitlement", () => ({
    canAccess: vi.fn().mockReturnValue(false),
  }))
  const service = await import("@/server/services/formation-service")
  const result = await service.getFormationBySlug("formation-premium", user)
  expect(findBySlug).toHaveBeenCalledWith("formation-premium", {
    includeBody: false,
  })
  return { lockedFields: ["body"], result }
}

async function auditJeu(user: SessionUser | null): Promise<ServiceAudit> {
  const findBySlug = vi.fn().mockResolvedValue({
    capacity: 20,
    closesAt: null,
    coverImage: null,
    excerpt: "EXTRAIT-PUBLIC-JEU",
    id: "jeu-premium",
    location: "Abidjan",
    slug: "jeu-premium",
    startsAt: null,
    summary: "Résumé public",
    title: "Jeu premium",
    visibility: "PREMIUM",
  })
  vi.doMock("@/server/repositories/jeu-repository", () => ({
    findBySlug,
    findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "PREMIUM" }),
  }))
  vi.doMock("@/server/access/entitlement", () => ({
    canAccess: vi.fn().mockReturnValue(false),
  }))
  const service = await import("@/server/services/jeu-service")
  const result = await service.getJeuBySlug("jeu-premium", user)
  expect(findBySlug).toHaveBeenCalledWith("jeu-premium", {
    includeBody: false,
  })
  return { lockedFields: ["body"], result }
}

async function auditOpportunite(
  user: SessionUser | null,
): Promise<ServiceAudit> {
  const findBySlug = vi.fn().mockResolvedValue({
    coverImage: null,
    deadline: null,
    excerpt: "EXTRAIT-PUBLIC-OPPORTUNITE",
    id: "opportunite-premium",
    organisme: "Synapse",
    slug: "opportunite-premium",
    summary: "Résumé public",
    title: "Opportunité premium",
    type: "FINANCEMENT",
    visibility: "PREMIUM",
  })
  vi.doMock("@/server/repositories/opportunite-repository", () => ({
    findBySlug,
    findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "PREMIUM" }),
  }))
  vi.doMock("@/server/access/entitlement", () => ({
    canAccess: vi.fn().mockReturnValue(false),
  }))
  const service = await import("@/server/services/opportunite-service")
  const result = await service.getOpportuniteBySlug("opportunite-premium", user)
  expect(findBySlug).toHaveBeenCalledWith("opportunite-premium", {
    includeLockedFields: false,
  })
  return { lockedFields: ["body", "externalUrl"], result }
}

const RUBRICS = [
  { audit: auditPrompt, label: "Prompts" },
  { audit: auditFormation, label: "Formations" },
  { audit: auditJeu, label: "Jeux et concours" },
  { audit: auditOpportunite, label: "Opportunités" },
] as const

afterEach(() => {
  vi.doUnmock("@/server/access/entitlement")
  vi.doUnmock("@/server/repositories/prompt-repository")
  vi.doUnmock("@/server/repositories/formation-repository")
  vi.doUnmock("@/server/repositories/jeu-repository")
  vi.doUnmock("@/server/repositories/opportunite-repository")
  vi.resetModules()
})

describe.each(RUBRICS)("audit unitaire $label", ({ audit, label }) => {
  it.each(ACTORS)(
    scenario(
      `${label} — un $labelActor ne déclenche jamais le chargement des champs verrouillés`,
      `un contenu PREMIUM ${label} et une identité non entitled`,
      "le service applique l'entitlement puis demande le détail",
      "le repository reçoit un select verrouillé, le DTO conserve l'extrait public sans body ni externalUrl, et la matrice de recette consigne le résultat",
    ).replace("$labelActor", "$label"),
    async ({ label: actor, user }) => {
      const { lockedFields, result } = await audit(user)

      for (const field of lockedFields) {
        expect(Object.prototype.hasOwnProperty.call(result, field)).toBe(false)
      }
      expectReleaseEvidence(releaseEvidence(), [
        new RegExp(`${label}[\\s\\S]{0,120}${actor}`, "iu"),
        /service[\s\S]{0,80}(?:body|externalUrl)[\s\S]{0,80}(?:absent|non chargé)/iu,
      ])
    },
  )
})
