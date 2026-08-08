import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type PageModule = {
  default: (
    props: Readonly<{ params: Promise<{ slug: string }> }>,
  ) => ReactNode | Promise<ReactNode>
}

type ErrorModule = {
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
}

const LOCKED_BODY_SENTINEL = "CORPS PREMIUM JAMAIS FOURNI AU COMPOSANT"
const TEASER = {
  coverImage: null,
  domain: "entrepreneuriat",
  excerpt:
    "Voici un aperçu concret pour comprendre le bénéfice avant de devenir membre.",
  id: "prompt-premium",
  slug: "prompt-premium",
  summary: "Un prompt structuré pour transformer une idée en plan d'action.",
  tags: ["business", "ia"],
  title: "Créer un business avec l'IA",
  visibility: "PREMIUM",
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

function isPageModule(value: unknown): value is PageModule {
  return isRecord(value) && typeof value.default === "function"
}

function isErrorModule(value: unknown): value is ErrorModule {
  return isRecord(value) && typeof value.default === "function"
}

async function loadPage(): Promise<PageModule> {
  const modulePath = "@/app/(public)/prompts/[slug]/page"
  const module: unknown = await vi.importActual(modulePath)
  if (!isPageModule(module)) {
    throw new Error("la page /prompts/[slug] doit exporter un composant")
  }
  return module
}

describe("détail visuel d'un prompt premium", () => {
  afterEach(() => {
    cleanup()
    vi.doUnmock("@/server/auth/config")
    vi.doUnmock("@/server/services/prompt-service")
    vi.resetModules()
  })

  it(
    scenario(
      "Le teaser maximise la conversion sans transformer le flou en protection",
      "un visiteur anonyme et un PromptTeaser dont le service n'a jamais fourni body",
      "le Server Component de détail est rendu",
      "titre, résumé, tags et excerpt restent lisibles, un badge premium et un cadenas sont annoncés, puis tout le bloc verrouillé mène à /register et contient un faux aperçu flouté aria-hidden sans corps réel",
    ),
    async () => {
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue(TEASER),
      }))
      const page = await loadPage()

      const rendered = render(
        await page.default({ params: Promise.resolve({ slug: TEASER.slug }) }),
      )

      expect(
        screen.getByRole("heading", { name: TEASER.title }),
      ).toBeInTheDocument()
      expect(screen.getByText(TEASER.summary)).toBeInTheDocument()
      expect(screen.getByText(TEASER.excerpt)).toBeInTheDocument()
      expect(screen.getByText(TEASER.domain)).toBeInTheDocument()
      expect(screen.getByText("business")).toBeInTheDocument()
      expect(screen.getByText("ia")).toBeInTheDocument()
      expect(screen.getByText(/premium/i)).toBeInTheDocument()
      expect(screen.getByText(/verrouill|cadenas/i)).toBeInTheDocument()

      const callToAction = screen.getByRole("link", {
        name: /devenir membre|débloquer|accéder.*contenu/i,
      })
      expect(callToAction).toHaveAttribute("href", "/register")
      expect(callToAction).toHaveTextContent(/membre|contenu exclusif/i)
      const blurredPreview = rendered.container.querySelector(
        '[aria-hidden="true"]',
      )
      expect(blurredPreview).not.toBeNull()
      expect(blurredPreview?.className).toMatch(/blur/)
      expect(blurredPreview?.closest("a")).toBe(callToAction)
      expect(rendered.container.textContent).not.toContain(LOCKED_BODY_SENTINEL)
    },
  )

  it(
    scenario(
      "Le DTO complet affiche le corps sans faux verrouillage",
      "un membre entitled et un PromptFull contenant le corps",
      "le Server Component de détail est rendu",
      "le corps complet est lisible et aucun appel à devenir membre ni aperçu flouté n'est présent",
    ),
    async () => {
      const body = "CORPS COMPLET AUTORISÉ"
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: {
            email: "premium@example.test",
            id: "user-premium",
            membership: "PREMIUM",
          },
        }),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue({ ...TEASER, body }),
      }))
      const page = await loadPage()

      const rendered = render(
        await page.default({ params: Promise.resolve({ slug: TEASER.slug }) }),
      )

      expect(screen.getByText(body)).toBeInTheDocument()
      expect(
        screen.queryByRole("link", {
          name: /devenir membre|débloquer|accéder.*contenu/i,
        }),
      ).not.toBeInTheDocument()
      expect(
        rendered.container.querySelector('[aria-hidden="true"].blur'),
      ).toBeNull()
    },
  )

  it(
    scenario(
      "L'état loading annonce le chargement du prompt",
      "la navigation vers un détail pendant sa lecture serveur",
      "le fallback loading de /prompts/[slug] est rendu",
      "un statut accessible annonce explicitement le chargement",
    ),
    async () => {
      const modulePath = "@/app/(public)/prompts/[slug]/loading"
      const module: unknown = await vi.importActual(modulePath)
      if (!isRecord(module) || typeof module.default !== "function") {
        throw new Error("le détail prompt doit exporter un état loading")
      }

      render(module.default())

      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
    },
  )

  it(
    scenario(
      "L'état error protège le détail et permet de réessayer",
      "une erreur de lecture du détail et une fonction reset",
      "la frontière d'erreur est rendue puis son action activée",
      "une alerte générique est visible, le corps d'erreur n'est pas affiché et reset est appelé une fois",
    ),
    async () => {
      const reset = vi.fn()
      const modulePath = "@/app/(public)/prompts/[slug]/error"
      const module: unknown = await vi.importActual(modulePath)
      if (!isErrorModule(module)) {
        throw new Error("le détail prompt doit exporter un état error")
      }

      render(
        module.default({
          error: new Error(LOCKED_BODY_SENTINEL),
          reset,
        }),
      )
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))

      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.queryByText(LOCKED_BODY_SENTINEL)).not.toBeInTheDocument()
      expect(reset).toHaveBeenCalledTimes(1)
    },
  )

  it(
    scenario(
      "L'état empty signale un prompt introuvable sans contenu inventé",
      "un slug qui ne correspond à aucun prompt publié",
      "l'état not-found du détail est rendu",
      "le contenu principal annonce que le prompt est introuvable et propose un retour vers /prompts",
    ),
    async () => {
      const modulePath = "@/app/(public)/prompts/[slug]/not-found"
      const module: unknown = await vi.importActual(modulePath)
      if (!isRecord(module) || typeof module.default !== "function") {
        throw new Error("le détail prompt doit exporter un état not-found")
      }

      render(module.default())

      expect(screen.getByRole("main")).toHaveTextContent(
        /prompt.*introuvable|aucun prompt/i,
      )
      expect(
        screen.getByRole("link", { name: /retour|prompts/i }),
      ).toHaveAttribute("href", "/prompts")
    },
  )
})
