import type { ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type ListPage = Readonly<{
  default: (
    props: Readonly<{ searchParams: Promise<Record<string, string>> }>,
  ) => ReactNode | Promise<ReactNode>
}>

type DetailPage = Readonly<{
  default: (
    props: Readonly<{ params: Promise<{ slug: string }> }>,
  ) => ReactNode | Promise<ReactNode>
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

function isListPage(value: unknown): value is ListPage {
  return isRecord(value) && typeof value.default === "function"
}

function isDetailPage(value: unknown): value is DetailPage {
  return isRecord(value) && typeof value.default === "function"
}

function listPageOf(value: unknown): ListPage {
  if (!isListPage(value)) {
    throw new Error("la page de liste doit exporter un composant")
  }
  return value
}

function detailPageOf(value: unknown): DetailPage {
  if (!isDetailPage(value)) {
    throw new Error("la page de détail doit exporter un composant")
  }
  return value
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/formation-service")
  vi.doUnmock("@/server/services/opportunite-service")
  vi.resetModules()
})

describe("interface homogène des Formations et Opportunités", () => {
  it(
    scenario(
      "La liste Formations distingue permanente et événementielle sans mêler l'accès premium",
      "une carte permanente FREE et une carte événementielle PREMIUM future",
      "le Server Component /formations rend la page succès",
      "les deux cartes 4/3 affichent nature, niveau, format et badge indépendant, avec liens de détail accessibles",
    ),
    async () => {
      vi.doMock("@/server/services/formation-service", () => ({
        getFormations: vi.fn().mockResolvedValue({
          items: [
            {
              coverImage: null,
              durationH: 4,
              format: "EN_LIGNE",
              id: "permanente",
              kind: "PERMANENTE",
              level: "DEBUTANT",
              slug: "permanente",
              startsAt: null,
              summary: "Disponible à tout moment",
              title: "Apprendre durablement",
              visibility: "FREE",
            },
            {
              coverImage: null,
              durationH: 2,
              format: "PRESENTIEL",
              id: "evenement",
              kind: "EVENEMENTIELLE",
              level: "AVANCE",
              slug: "evenement",
              startsAt: "2026-12-12T10:00:00.000Z",
              summary: "Session datée",
              title: "Atelier ponctuel",
              visibility: "PREMIUM",
            },
          ],
          nextCursor: null,
        }),
      }))
      const page = listPageOf(await import("@/app/(public)/formations/page"))

      const rendered = render(
        await page.default({ searchParams: Promise.resolve({}) }),
      )

      expect(
        screen.getByRole("heading", { name: "Apprendre durablement" }),
      ).toBeVisible()
      expect(
        screen.getByRole("heading", { name: "Atelier ponctuel" }),
      ).toBeVisible()
      expect(screen.getByText(/permanente/i)).toBeVisible()
      expect(screen.getByText(/événementielle/i)).toBeVisible()
      expect(screen.getByText(/premium/i)).toBeVisible()
      expect(screen.getByText(/12.*2026|2026.*12/i)).toBeVisible()
      const cardImages = rendered.container.querySelectorAll("article img")
      expect(cardImages).toHaveLength(2)
      for (const image of cardImages) {
        expect(image.className).toMatch(/card-image/u)
      }
      expect(
        screen.getByRole("link", { name: /apprendre durablement/i }),
      ).toHaveAttribute("href", "/formations/permanente")
    },
  )

  it(
    scenario(
      "Une formation permanente complète se consulte sans inscription",
      "un DTO FormationFull permanent et FREE avec programme",
      "le détail /formations/[slug] est rendu",
      "le programme est lisible, aucune action d'inscription n'existe et le niveau comme le format sont annoncés",
    ),
    async () => {
      const full = {
        body: "Programme permanent complet",
        coverImage: null,
        durationH: 6,
        excerpt: "Extrait public",
        format: "EN_LIGNE",
        id: "permanente",
        kind: "PERMANENTE",
        level: "INTERMEDIAIRE",
        slug: "permanente",
        startsAt: null,
        summary: "Disponible sans date",
        title: "Formation permanente",
        visibility: "FREE",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug: vi.fn().mockResolvedValue(full),
      }))
      const page = detailPageOf(
        await import("@/app/(public)/formations/[slug]/page"),
      )

      render(
        await page.default({ params: Promise.resolve({ slug: full.slug }) }),
      )

      expect(screen.getByText(full.body)).toBeVisible()
      expect(screen.getByText(/intermédiaire/i)).toBeVisible()
      expect(screen.getByText(/en ligne/i)).toBeVisible()
      expect(
        screen.queryByRole("link", { name: /inscri/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /inscri/i }),
      ).not.toBeInTheDocument()
    },
  )

  it(
    scenario(
      "Le teaser premium Formation affiche un extrait de conversion sans programme caché",
      "un visiteur anonyme et une FormationTeaser PREMIUM événementielle",
      "le détail est rendu sans body fourni",
      "titre, résumé, excerpt et date restent lisibles, le CTA membre mène à /register et aucune inscription événement n'est anticipée",
    ),
    async () => {
      const teaser = {
        excerpt: "Découvrez les compétences acquises avant de devenir membre.",
        kind: "EVENEMENTIELLE",
        slug: "atelier-premium",
        startsAt: "2026-12-12T10:00:00.000Z",
        summary: "Résumé public",
        title: "Atelier premium",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/formation-service", () => ({
        getFormationBySlug: vi.fn().mockResolvedValue(teaser),
      }))
      const page = detailPageOf(
        await import("@/app/(public)/formations/[slug]/page"),
      )

      render(
        await page.default({ params: Promise.resolve({ slug: teaser.slug }) }),
      )

      expect(screen.getByText(teaser.excerpt)).toBeVisible()
      expect(
        screen.getByRole("link", { name: /devenir membre|débloquer/i }),
      ).toHaveAttribute("href", "/register")
      expect(screen.queryByText(/PROGRAMME-SECRET/u)).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /inscri/i }),
      ).not.toBeInTheDocument()
    },
  )

  it(
    scenario(
      "Le détail Opportunité verrouille ensemble contenu et candidature",
      "un visiteur anonyme et un teaser PREMIUM sans body ni externalUrl",
      "le détail /opportunites/[slug] est rendu",
      "organisme, deadline et extrait sont publics, le CTA membre remplace tout lien de candidature et aucune sentinelle ne paraît",
    ),
    async () => {
      const teaser = {
        deadline: "2026-12-31T23:59:59.000Z",
        excerpt: "Une occasion concrète pour votre projet.",
        organisme: "Synapse",
        slug: "financement-premium",
        summary: "Résumé public",
        title: "Financement premium",
        type: "FINANCEMENT",
        visibility: "PREMIUM",
      }
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportuniteBySlug: vi.fn().mockResolvedValue(teaser),
      }))
      const page = detailPageOf(
        await import("@/app/(public)/opportunites/[slug]/page"),
      )

      render(
        await page.default({ params: Promise.resolve({ slug: teaser.slug }) }),
      )

      expect(screen.getByText(teaser.excerpt)).toBeVisible()
      expect(screen.getByText(teaser.organisme)).toBeVisible()
      expect(
        screen.queryByRole("link", { name: /candidater|postuler/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /devenir membre|débloquer/i }),
      ).toHaveAttribute("href", "/register")
      expect(document.body.textContent).not.toMatch(/BODY-SECRET|URL-SECRET/u)
    },
  )
})
