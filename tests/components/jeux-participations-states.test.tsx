import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

type ComponentModule = Readonly<{ default: () => ReactNode }>
type ErrorModule = Readonly<{
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
}>
type ListPage = Readonly<{
  default: (props: {
    searchParams: Promise<Record<string, string>>
  }) => Promise<ReactNode> | ReactNode
}>

function isComponentModule(value: unknown): value is ComponentModule {
  return isRecord(value) && typeof value.default === "function"
}

function isErrorModule(value: unknown): value is ErrorModule {
  return isRecord(value) && typeof value.default === "function"
}

function isListPage(value: unknown): value is ListPage {
  return isRecord(value) && typeof value.default === "function"
}

function componentOf(value: unknown): ComponentModule {
  if (!isComponentModule(value)) {
    throw new Error("le composant d'état doit être exporté")
  }
  return value
}

function errorOf(value: unknown): ErrorModule {
  if (!isErrorModule(value)) {
    throw new Error("la frontière d'erreur doit être exportée")
  }
  return value
}

function listPageOf(value: unknown): ListPage {
  if (!isListPage(value)) {
    throw new Error("la page de liste doit être exportée")
  }
  return value
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/server/services/jeu-service")
  vi.resetModules()
})

describe("états explicites des écrans Jeux et participations", () => {
  it(
    scenario(
      "La liste Jeux expose loading, error, empty et success",
      "les frontières de la rubrique et un service qui retourne zéro jeu",
      "chaque état est rendu séparément",
      "loading annonce le chargement, error reste générique et réessayable, empty annonce l'absence de concours, puis le succès est couvert par les cartes",
    ),
    async () => {
      render(componentOf(await import("@/app/(public)/jeux/loading")).default())
      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
      cleanup()

      const reset = vi.fn()
      render(
        errorOf(await import("@/app/(public)/jeux/error")).default({
          error: new Error("SECRET INTERNE"),
          reset,
        }),
      )
      expect(screen.getByRole("alert")).not.toHaveTextContent("SECRET INTERNE")
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledOnce()
      cleanup()

      vi.doMock("@/server/services/jeu-service", () => ({
        getJeux: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      }))
      const page = listPageOf(await import("@/app/(public)/jeux/page"))
      render(await page.default({ searchParams: Promise.resolve({}) }))
      expect(screen.getByRole("main")).toHaveTextContent(
        /aucun jeu|aucun concours/i,
      )
    },
  )

  it(
    scenario(
      "Le détail Jeu expose loading, error et not-found en plus du succès",
      "les trois frontières du détail d'un concours",
      "elles sont rendues séparément",
      "elles annoncent chargement, erreur générique réessayable et concours introuvable avec retour à /jeux",
    ),
    async () => {
      render(
        componentOf(
          await import("@/app/(public)/jeux/[slug]/loading"),
        ).default(),
      )
      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
      cleanup()

      const reset = vi.fn()
      render(
        errorOf(await import("@/app/(public)/jeux/[slug]/error")).default({
          error: new Error("SECRET INTERNE"),
          reset,
        }),
      )
      expect(screen.getByRole("alert")).not.toHaveTextContent("SECRET INTERNE")
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledOnce()
      cleanup()

      render(
        componentOf(
          await import("@/app/(public)/jeux/[slug]/not-found"),
        ).default(),
      )
      expect(screen.getByRole("main")).toHaveTextContent(
        /jeu.*introuvable|concours.*introuvable/i,
      )
      expect(screen.getByRole("link", { name: /retour/i })).toHaveAttribute(
        "href",
        "/jeux",
      )
    },
  )
})
