import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"
import { FREE_USER, PREMIUM_USER } from "./inscription-service-fixtures"

type JeuService = Readonly<{
  getJeuBySlug: (
    slug: string,
    user: typeof FREE_USER | null,
  ) => Promise<unknown>
  getJeux: (query: Readonly<Record<string, unknown>>) => Promise<unknown>
}>

function isJeuService(value: unknown): value is JeuService {
  return (
    isRecord(value) &&
    typeof value.getJeuBySlug === "function" &&
    typeof value.getJeux === "function"
  )
}

async function loadService(): Promise<JeuService> {
  const module: unknown = await import("@/server/services/jeu-service")
  if (!isJeuService(module)) {
    throw new Error("jeu-service doit exposer liste et détail")
  }
  return module
}

afterEach(() => {
  vi.doUnmock("@/server/access/entitlement")
  vi.doUnmock("@/server/repositories/jeu-repository")
  vi.resetModules()
})

describe("service de contenu Jeux et concours", () => {
  it.each([
    ["anonyme", null],
    ["membre FREE", FREE_USER],
  ])(
    scenario(
      "Le teaser d'un concours premium exclut les règles pour un %s",
      "un concours PREMIUM et un acteur non entitled",
      "le service charge les métadonnées puis le détail",
      "canAccess centralise la décision, le repository reçoit includeBody false et le DTO ne contient aucune clé body",
    ),
    async (_actor, user) => {
      const meta = { visibility: "PREMIUM" }
      const teaser = {
        capacity: 30,
        closesAt: new Date("2026-12-11T23:59:59.000Z"),
        excerpt: "Aperçu public",
        id: "jeu-premium",
        location: "Abidjan",
        slug: "jeu-premium",
        startsAt: new Date("2026-12-12T10:00:00.000Z"),
        summary: "Résumé public",
        title: "Challenge premium",
        visibility: "PREMIUM",
      }
      const findBySlug = vi.fn().mockResolvedValue(teaser)
      const findMetaBySlug = vi.fn().mockResolvedValue(meta)
      const canAccess = vi.fn().mockReturnValue(false)
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findBySlug,
        findMetaBySlug,
      }))
      vi.doMock("@/server/access/entitlement", () => ({ canAccess }))
      const service = await loadService()

      const result = await service.getJeuBySlug("jeu-premium", user)

      expect(canAccess).toHaveBeenCalledWith(user, meta)
      expect(findBySlug).toHaveBeenCalledWith("jeu-premium", {
        includeBody: false,
      })
      expect(JSON.stringify(result)).not.toMatch(/body|REGLES-SECRETES/u)
    },
  )

  it(
    scenario(
      "Un membre PREMIUM reçoit les règles complètes du concours",
      "un concours PREMIUM et une SessionUser PREMIUM",
      "le service applique canAccess puis charge le détail",
      "le repository reçoit includeBody true et le DTO sérialise les dates avec le body intact",
    ),
    async () => {
      const full = {
        body: "Règles complètes",
        capacity: 30,
        closesAt: new Date("2026-12-11T23:59:59.000Z"),
        excerpt: "Aperçu public",
        id: "jeu-premium",
        location: "Abidjan",
        slug: "jeu-premium",
        startsAt: new Date("2026-12-12T10:00:00.000Z"),
        summary: "Résumé public",
        title: "Challenge premium",
        visibility: "PREMIUM",
      }
      const findBySlug = vi.fn().mockResolvedValue(full)
      vi.doMock("@/server/repositories/jeu-repository", () => ({
        findBySlug,
        findMetaBySlug: vi.fn().mockResolvedValue({ visibility: "PREMIUM" }),
      }))
      vi.doMock("@/server/access/entitlement", () => ({
        canAccess: vi.fn().mockReturnValue(true),
      }))
      const service = await loadService()

      const result = await service.getJeuBySlug("jeu-premium", PREMIUM_USER)

      expect(findBySlug).toHaveBeenCalledWith("jeu-premium", {
        includeBody: true,
      })
      expect(result).toMatchObject({
        body: "Règles complètes",
        closesAt: "2026-12-11T23:59:59.000Z",
        startsAt: "2026-12-12T10:00:00.000Z",
      })
    },
  )
})
