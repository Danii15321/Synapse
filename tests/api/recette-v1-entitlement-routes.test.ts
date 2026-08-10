import { afterEach, describe, expect, it, vi } from "vitest"

import {
  expectReleaseEvidence,
  releaseEvidence,
  scenario,
} from "../fixtures/recette-v1-test-utils"

type SessionUser = Readonly<{
  email: string
  id: string
  membership: "FREE"
}>

type DetailRoute = Readonly<{
  GET: (
    request: Request,
    context: Readonly<{ params: Promise<{ slug: string }> }>,
  ) => Promise<Response> | Response
}>

type Rubric = Readonly<{
  lockedFields: readonly string[]
  path: "formations" | "jeux" | "opportunites" | "prompts"
  teaser: Readonly<Record<string, unknown>>
}>

const ACTORS = [
  { label: "visiteur anonyme", user: null },
  {
    label: "membre FREE",
    user: {
      email: "free-route-recette@example.test",
      id: "free-route-recette",
      membership: "FREE",
    } satisfies SessionUser,
  },
] as const

const RUBRICS: readonly Rubric[] = [
  {
    lockedFields: ["body"],
    path: "prompts",
    teaser: {
      excerpt: "EXTRAIT-PUBLIC-PROMPT",
      slug: "prompt-premium",
      title: "Prompt premium",
      visibility: "PREMIUM",
    },
  },
  {
    lockedFields: ["body"],
    path: "formations",
    teaser: {
      excerpt: "EXTRAIT-PUBLIC-FORMATION",
      slug: "formation-premium",
      title: "Formation premium",
      visibility: "PREMIUM",
    },
  },
  {
    lockedFields: ["body"],
    path: "jeux",
    teaser: {
      excerpt: "EXTRAIT-PUBLIC-JEU",
      slug: "jeu-premium",
      title: "Jeu premium",
      visibility: "PREMIUM",
    },
  },
  {
    lockedFields: ["body", "externalUrl"],
    path: "opportunites",
    teaser: {
      excerpt: "EXTRAIT-PUBLIC-OPPORTUNITE",
      slug: "opportunite-premium",
      title: "Opportunité premium",
      visibility: "PREMIUM",
    },
  },
]

function isDetailRoute(value: unknown): value is DetailRoute {
  return (
    typeof value === "object" &&
    value !== null &&
    "GET" in value &&
    typeof value.GET === "function"
  )
}

async function loadRoute(rubric: Rubric): Promise<DetailRoute> {
  let module: unknown
  switch (rubric.path) {
    case "prompts":
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue(rubric.teaser),
      }))
      module = await import("@/app/api/prompts/[slug]/route")
      break
    case "formations":
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug: vi.fn().mockResolvedValue(rubric.teaser),
      }))
      module = await import("@/app/api/formations/[slug]/route")
      break
    case "jeux":
      vi.doMock("@/server/services/jeu-service", () => ({
        getJeuBySlug: vi.fn().mockResolvedValue(rubric.teaser),
      }))
      module = await import("@/app/api/jeux/[slug]/route")
      break
    case "opportunites":
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug: vi.fn().mockResolvedValue(rubric.teaser),
      }))
      module = await import("@/app/api/opportunites/[slug]/route")
      break
  }
  if (!isDetailRoute(module)) {
    throw new Error(`GET /api/${rubric.path}/[slug] doit être exporté`)
  }
  return module
}

afterEach(() => {
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/prompt-service")
  vi.doUnmock("@/server/services/formation-service")
  vi.doUnmock("@/server/services/jeu-service")
  vi.doUnmock("@/server/services/opportunite-service")
  vi.resetModules()
})

describe.each(RUBRICS)("audit Route Handler $path", (rubric) => {
  it.each(ACTORS)(
    scenario(
      `${rubric.path} — le JSON HTTP brut d'un $label exclut tous les champs verrouillés`,
      "un contenu PREMIUM et une session absente ou FREE vérifiée côté serveur",
      `GET /api/${rubric.path}/[slug] est invoqué directement`,
      "la réponse 200 contient le teaser mais aucune clé verrouillée ni sentinelle et la preuve finale nomme cet acteur",
    ),
    async ({ label, user }) => {
      vi.doMock("@/server/auth/config", () => ({
        auth: vi
          .fn()
          .mockResolvedValue(
            user ? { expires: "2099-01-01T00:00:00.000Z", user } : null,
          ),
      }))
      const route = await loadRoute(rubric)
      const slug = String(rubric.teaser.slug)

      const response = await route.GET(
        new Request(`http://localhost/api/${rubric.path}/${slug}`),
        { params: Promise.resolve({ slug }) },
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(JSON.parse(raw)).toEqual(rubric.teaser)
      for (const field of rubric.lockedFields) {
        expect(raw).not.toContain(`"${field}"`)
      }
      expect(raw).not.toMatch(/SENTINELLE-(?:BODY|URL)/u)
      expectReleaseEvidence(releaseEvidence(), [
        new RegExp(`${rubric.path}[\\s\\S]{0,120}${label}`, "iu"),
        /JSON brut/iu,
      ])
    },
  )
})
