import { createElement, type ComponentType } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>

type ErrorPageModule = {
  default: ComponentType<ErrorPageProps>
}

type NotFoundModule = {
  default: ComponentType
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

function isErrorPageModule(value: unknown): value is ErrorPageModule {
  return isRecord(value) && typeof value.default === "function"
}

function isNotFoundModule(value: unknown): value is NotFoundModule {
  return isRecord(value) && typeof value.default === "function"
}

describe("écrans d'erreur globaux", () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it(
    scenario(
      "L'écran d'erreur affiche une référence sans révéler le détail interne",
      "une erreur globale portant un message Prisma sensible, une stack et un errorId dans son digest",
      "app/error.tsx est rendu",
      "le message générique et l'errorId sont visibles, le détail interne et DATABASE_URL restent absents et l'action Réessayer mesure au moins 44px",
    ),
    async () => {
      const errorId = "3fd1331b-8d34-4ff4-8379-96bd2fff3195"
      const error = Object.assign(
        new Error("Prisma PromptSecret DATABASE_URL=postgresql://secret"),
        { digest: errorId },
      )
      const module: unknown = await vi.importActual("@/app/error")
      if (!isErrorPageModule(module)) {
        throw new Error("app/error.tsx doit exporter un composant par défaut")
      }

      render(createElement(module.default, { error, reset: vi.fn() }))

      expect(
        screen.getByRole("heading", { name: /une erreur est survenue/i }),
      ).toBeInTheDocument()
      expect(screen.getByText(new RegExp(errorId))).toBeInTheDocument()
      expect(
        screen.queryByText(/Prisma|PromptSecret|DATABASE_URL|postgresql/i),
      ).toBeNull()
      expect(screen.getByRole("button", { name: /réessayer/i })).toHaveClass(
        "min-h-touch",
      )
    },
  )

  it(
    scenario(
      "L'écran introuvable reste générique, accessible et adapté au viewport mobile",
      "une navigation vers une route qui n'existe pas",
      "app/not-found.tsx est rendu",
      "un main et un titre explicite sont présents, aucune donnée serveur n'apparaît et le lien de retour mesure au moins 44px",
    ),
    async () => {
      const module: unknown = await vi.importActual("@/app/not-found")
      if (!isNotFoundModule(module)) {
        throw new Error(
          "app/not-found.tsx doit exporter un composant par défaut",
        )
      }

      render(createElement(module.default))

      expect(screen.getByRole("main")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: /introuvable|trouvée/i }),
      ).toBeInTheDocument()
      expect(screen.queryByText(/Prisma|DATABASE_URL|postgresql/i)).toBeNull()
      expect(screen.getByRole("link", { name: /accueil|retour/i })).toHaveClass(
        "min-h-touch",
      )
    },
  )
})
