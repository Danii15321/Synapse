import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type PageModule = {
  default: () => ReactNode | Promise<ReactNode>
}

type ErrorModule = {
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
}

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

async function loadPromptsPage(): Promise<PageModule> {
  const module: unknown = await import("@/app/(public)/prompts/page")

  if (!isPageModule(module)) {
    throw new Error(
      "la page /prompts doit exporter un Server Component par défaut",
    )
  }

  return module
}

describe("états de la page publique Prompts", () => {
  afterEach(() => {
    cleanup()
    vi.doUnmock("@/server/services/prompt-service")
    vi.resetModules()
  })

  it(
    scenario(
      "L'état success affiche chaque prompt retourné par le service",
      "un service en mémoire qui retourne deux DTO prompts",
      "le Server Component /prompts est rendu",
      "les deux titres et les deux résumés sont présents dans le contenu principal",
    ),
    async () => {
      vi.doMock("@/server/services/prompt-service", () => ({
        getPrompts: vi.fn().mockResolvedValue({
          items: [
            {
              coverImage: null,
              domain: "ia",
              id: "prompt-1",
              slug: "premier-prompt",
              summary: "Premier résumé",
              tags: ["test"],
              title: "Premier prompt",
              visibility: "FREE",
            },
            {
              coverImage: "/images/prompts/deuxieme.webp",
              domain: "communication",
              id: "prompt-2",
              slug: "deuxieme-prompt",
              summary: "Deuxième résumé",
              tags: ["oral"],
              title: "Deuxième prompt",
              visibility: "PREMIUM",
            },
          ],
          nextCursor: null,
        }),
      }))
      const page = await loadPromptsPage()

      render(await page.default())

      expect(screen.getByRole("main")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Premier prompt" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Deuxième prompt" }),
      ).toBeInTheDocument()
      expect(screen.getByText("Premier résumé")).toBeInTheDocument()
      expect(screen.getByText("Deuxième résumé")).toBeInTheDocument()
    },
  )

  it(
    scenario(
      "L'état empty explique qu'aucun prompt n'est disponible",
      "un service en mémoire qui retourne une liste vide",
      "le Server Component /prompts est rendu",
      "le contenu principal affiche un message explicite sans carte de prompt inventée",
    ),
    async () => {
      vi.doMock("@/server/services/prompt-service", () => ({
        getPrompts: vi.fn().mockResolvedValue({
          items: [],
          nextCursor: null,
        }),
      }))
      const page = await loadPromptsPage()

      render(await page.default())

      expect(screen.getByRole("main")).toBeInTheDocument()
      expect(screen.getByText(/aucun prompt/i)).toBeInTheDocument()
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    },
  )

  it(
    scenario(
      "Le fichier loading.tsx expose déterministement un état de chargement accessible",
      "le module loading.tsx de /prompts importé directement, sans dépendre du timing d'une navigation réseau",
      "son composant par défaut est rendu isolément",
      "le contenu principal contient un statut accessible qui annonce exactement le chargement des prompts",
    ),
    async () => {
      const module: unknown = await import("@/app/(public)/prompts/loading")
      if (!isPageModule(module)) {
        throw new Error("la route /prompts doit exporter un état loading")
      }

      render(await module.default())

      const status = screen.getByRole("status")

      expect(screen.getByRole("main")).toContainElement(status)
      expect(status).toHaveTextContent(/^Chargement des prompts…$/u)
    },
  )

  it(
    scenario(
      "L'état error informe le visiteur et permet une nouvelle tentative",
      "une erreur de lecture sur la route /prompts et une fonction reset",
      "la frontière d'erreur de la route est rendue puis son action activée",
      "une alerte accessible est visible et reset est appelé exactement une fois",
    ),
    async () => {
      const reset = vi.fn()
      const module: unknown = await import("@/app/(public)/prompts/error")
      if (!isErrorModule(module)) {
        throw new Error("la route /prompts doit exporter un état error")
      }

      render(module.default({ error: new Error("base indisponible"), reset }))
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))

      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(reset).toHaveBeenCalledTimes(1)
    },
  )
})
