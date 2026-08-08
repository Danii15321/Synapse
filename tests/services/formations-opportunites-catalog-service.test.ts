import { afterEach, describe, expect, it, vi } from "vitest"

import { scenario } from "../repositories/replicated-content-fixtures"

type CatalogService = Readonly<{
  getItems: (query: Readonly<{ take: number }>) => Promise<unknown>
}>

type FormationCatalogModule = Readonly<{
  getFormations: CatalogService["getItems"]
}>

type OpportuniteCatalogModule = Readonly<{
  getOpportunites: CatalogService["getItems"]
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isFormationCatalogModule(
  value: unknown,
): value is FormationCatalogModule {
  return isRecord(value) && typeof value.getFormations === "function"
}

function isOpportuniteCatalogModule(
  value: unknown,
): value is OpportuniteCatalogModule {
  return isRecord(value) && typeof value.getOpportunites === "function"
}

async function formationService(): Promise<CatalogService> {
  const module: unknown = await import("@/server/services/formation-service")
  if (!isFormationCatalogModule(module)) {
    throw new Error("getFormations requis")
  }
  return { getItems: module.getFormations }
}

async function opportuniteService(): Promise<CatalogService> {
  const module: unknown = await import("@/server/services/opportunite-service")
  if (!isOpportuniteCatalogModule(module)) {
    throw new Error("getOpportunites requis")
  }
  return { getItems: module.getOpportunites }
}

afterEach(() => vi.resetModules())

describe("pagination des services répliqués", () => {
  it(
    scenario(
      "La pagination répliquée reste bornée et produit un curseur opaque",
      "trois cartes de chaque rubrique pour une demande de deux éléments",
      "les deux services construisent leur page",
      "chacun demande take+1, retourne deux cartes sans champ verrouillé et un nextCursor",
    ),
    async () => {
      const formationRows = [
        {
          coverImage: null,
          durationH: 3,
          format: "EN_LIGNE",
          id: "formation-1",
          kind: "PERMANENTE",
          level: "DEBUTANT",
          slug: "formation-1",
          startsAt: null,
          summary: "Résumé formation 1",
          title: "Formation 1",
          visibility: "FREE",
        },
        {
          coverImage: "/images/formations/deux.webp",
          durationH: 5,
          format: "HYBRIDE",
          id: "formation-2",
          kind: "EVENEMENTIELLE",
          level: "AVANCE",
          slug: "formation-2",
          startsAt: new Date("2026-12-12T10:00:00.000Z"),
          summary: "Résumé formation 2",
          title: "Formation 2",
          visibility: "PREMIUM",
        },
        {
          coverImage: null,
          durationH: null,
          format: "PRESENTIEL",
          id: "formation-3",
          kind: "PERMANENTE",
          level: "INTERMEDIAIRE",
          slug: "formation-3",
          startsAt: null,
          summary: "Résumé formation 3",
          title: "Formation 3",
          visibility: "FREE",
        },
      ]
      const opportuniteRows = [
        {
          coverImage: null,
          deadline: new Date("2026-12-31T23:59:59.000Z"),
          id: "opportunite-1",
          organisme: "Synapse",
          slug: "opportunite-1",
          summary: "Résumé opportunité 1",
          title: "Opportunité 1",
          type: "STAGE",
          visibility: "FREE",
        },
        {
          coverImage: "/images/opportunites/deux.webp",
          deadline: null,
          id: "opportunite-2",
          organisme: "Entreprise test",
          slug: "opportunite-2",
          summary: "Résumé opportunité 2",
          title: "Opportunité 2",
          type: "EMPLOI",
          visibility: "PREMIUM",
        },
        {
          coverImage: null,
          deadline: new Date("2027-01-31T23:59:59.000Z"),
          id: "opportunite-3",
          organisme: "Association test",
          slug: "opportunite-3",
          summary: "Résumé opportunité 3",
          title: "Opportunité 3",
          type: "COLLABORATION",
          visibility: "FREE",
        },
      ]
      const findFormations = vi.fn().mockResolvedValue(formationRows)
      const findOpportunites = vi.fn().mockResolvedValue(opportuniteRows)
      vi.doMock("@/server/repositories/formation-repository", () => ({
        findMany: findFormations,
      }))
      vi.doMock("@/server/repositories/opportunite-repository", () => ({
        findMany: findOpportunites,
      }))

      const formationPage = await (
        await formationService()
      ).getItems({ take: 2 })
      const opportunitePage = await (
        await opportuniteService()
      ).getItems({ take: 2 })

      expect(findFormations).toHaveBeenCalledWith({ take: 3 })
      expect(findOpportunites).toHaveBeenCalledWith({ take: 3 })
      expect(formationPage).toEqual({
        items: [
          formationRows[0],
          {
            ...formationRows[1],
            startsAt: "2026-12-12T10:00:00.000Z",
          },
        ],
        nextCursor: "formation-2",
      })
      expect(opportunitePage).toEqual({
        items: [
          {
            ...opportuniteRows[0],
            deadline: "2026-12-31T23:59:59.000Z",
          },
          opportuniteRows[1],
        ],
        nextCursor: "opportunite-2",
      })
      expect(JSON.stringify([formationPage, opportunitePage])).not.toMatch(
        /body|externalUrl/,
      )
    },
  )
})
