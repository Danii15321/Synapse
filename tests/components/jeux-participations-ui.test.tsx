import type { ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

type ListPage = Readonly<{
  default: (props: {
    searchParams: Promise<Record<string, string>>
  }) => Promise<ReactNode> | ReactNode
}>
type DetailPage = Readonly<{
  default: (props: {
    params: Promise<{ slug: string }>
  }) => Promise<ReactNode> | ReactNode
}>
function isListPage(value: unknown): value is ListPage {
  return isRecord(value) && typeof value.default === "function"
}

function isDetailPage(value: unknown): value is DetailPage {
  return isRecord(value) && typeof value.default === "function"
}

function listPageOf(value: unknown): ListPage {
  if (!isListPage(value)) {
    throw new Error("la page doit exporter un composant")
  }
  return value
}

function detailPageOf(value: unknown): DetailPage {
  if (!isDetailPage(value)) {
    throw new Error("la page doit exporter un composant")
  }
  return value
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/server")
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/formation-service")
  vi.doUnmock("@/server/services/jeu-service")
  vi.doUnmock("@/server/services/inscription-service")
  vi.resetModules()
})

describe("interface Jeux et Mes participations", () => {
  it(
    scenario(
      "Les cartes Jeux utilisent le visuel 4/3 et un repli présentable",
      "un concours publié sans coverImage et un autre PREMIUM avec affiche",
      "la page succès /jeux est rendue à partir du service",
      "les deux cartes affichent titre, résumé, dates et badge ; chaque image suit le patron 4/3 sans aspect cassé",
    ),
    async () => {
      vi.doMock("@/server/services/jeu-service", () => ({
        getJeux: vi.fn().mockResolvedValue({
          items: [
            {
              capacity: null,
              closesAt: "2026-12-11T23:59:59.000Z",
              coverImage: null,
              id: "jeu-free",
              location: "Abidjan",
              slug: "jeu-free",
              startsAt: "2026-12-12T10:00:00.000Z",
              summary: "Challenge ouvert à tous",
              title: "Défi innovation",
              visibility: "FREE",
            },
            {
              capacity: 20,
              closesAt: "2026-12-20T23:59:59.000Z",
              coverImage: "/brand/opengraph-synapse.webp",
              id: "jeu-premium",
              location: "En ligne",
              slug: "jeu-premium",
              startsAt: "2026-12-21T10:00:00.000Z",
              summary: "Concours réservé aux membres",
              title: "Challenge premium",
              visibility: "PREMIUM",
            },
          ],
          nextCursor: null,
        }),
      }))
      const page = listPageOf(await import("@/app/(public)/jeux/page"))

      const rendered = render(
        await page.default({ searchParams: Promise.resolve({}) }),
      )

      expect(
        screen.getByRole("heading", { name: "Défi innovation" }),
      ).toBeVisible()
      expect(
        screen.getByRole("heading", { name: "Challenge premium" }),
      ).toBeVisible()
      expect(screen.getByText(/premium/i)).toBeVisible()
      expect(screen.getByText(/12.*2026|2026.*12/i)).toBeVisible()
      const images = rendered.container.querySelectorAll("article img")
      expect(images).toHaveLength(2)
      for (const image of images) {
        expect(image.className).toMatch(/card-image/u)
        expect(image.getAttribute("src")).toBeTruthy()
      }
    },
  )

  it(
    scenario(
      "Le détail d'un jeu ouvert emploie le vocabulaire Participation",
      "un concours FREE complet, ouvert et un membre connecté non encore inscrit",
      "la page /jeux/[slug] est rendue",
      "les règles sont lisibles, l'action dit Je participe et la date comme le lieu sont annoncés avant l'activité hors plateforme",
    ),
    async () => {
      const user = {
        email: "member@example.test",
        id: "member",
        membership: "FREE",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user,
        }),
      }))
      vi.doMock("@/server/services/jeu-service", () => ({
        getJeuBySlug: vi.fn().mockResolvedValue({
          body: "Règles complètes du challenge",
          capacity: 20,
          closesAt: "2026-12-11T23:59:59.000Z",
          coverImage: null,
          excerpt: "Aperçu",
          id: "challenge",
          location: "Abidjan, Cocody",
          slug: "challenge",
          startsAt: "2026-12-12T10:00:00.000Z",
          summary: "Résumé",
          title: "Challenge entrepreneurial",
          visibility: "FREE",
        }),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        getParticipationState: vi.fn().mockResolvedValue("AVAILABLE"),
      }))
      const page = detailPageOf(await import("@/app/(public)/jeux/[slug]/page"))

      render(
        await page.default({ params: Promise.resolve({ slug: "challenge" }) }),
      )

      expect(screen.getByText("Règles complètes du challenge")).toBeVisible()
      expect(
        screen.getByRole("button", { name: /^je participe$/i }),
      ).toBeVisible()
      expect(screen.getByText(/abidjan.*cocody/i)).toBeVisible()
      expect(screen.getByText(/12.*2026|2026.*12/i)).toBeVisible()
      expect(screen.getByRole("main")).toHaveTextContent(/hors plateforme/i)
    },
  )

  it(
    scenario(
      "Une formation permanente reste sans action et une événementielle expose Je participe",
      "deux détails Formation FREE, l'un PERMANENTE et l'autre EVENEMENTIELLE future",
      "les deux pages sont rendues pour le même membre",
      "aucun contrôle n'existe pour la permanente tandis que l'événementielle permet la participation",
    ),
    async () => {
      const getFormationBySlug = vi.fn(async (slug: string) => ({
        body: "Programme",
        coverImage: null,
        durationH: 2,
        excerpt: "Extrait",
        format: "EN_LIGNE",
        id: slug,
        kind: slug === "permanente" ? "PERMANENTE" : "EVENEMENTIELLE",
        level: "DEBUTANT",
        slug,
        startsAt: slug === "permanente" ? null : "2026-12-12T10:00:00.000Z",
        summary: "Résumé",
        title: slug === "permanente" ? "Permanente" : "Événement",
        visibility: "FREE",
      }))
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: { email: "m@example.test", id: "m", membership: "FREE" },
        }),
      }))
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug,
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        getParticipationState: vi.fn().mockResolvedValue("AVAILABLE"),
      }))
      const page = detailPageOf(
        await import("@/app/(public)/formations/[slug]/page"),
      )

      const permanent = render(
        await page.default({ params: Promise.resolve({ slug: "permanente" }) }),
      )
      expect(
        screen.queryByRole("button", { name: /^je participe$/i }),
      ).not.toBeInTheDocument()
      permanent.unmount()
      render(
        await page.default({ params: Promise.resolve({ slug: "evenement" }) }),
      )
      expect(
        screen.getByRole("button", { name: /^je participe$/i }),
      ).toBeVisible()
    },
  )
})
