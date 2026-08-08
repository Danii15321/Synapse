import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type ComponentModule = Readonly<{
  default: (props?: never) => ReactNode
}>

type ErrorModule = Readonly<{
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
}>

function scenario(name: string, given: string, when: string, then: string) {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isComponentModule(value: unknown): value is ComponentModule {
  return isRecord(value) && typeof value.default === "function"
}

function isErrorModule(value: unknown): value is ErrorModule {
  return isRecord(value) && typeof value.default === "function"
}

function componentOf(value: unknown): ComponentModule {
  if (!isComponentModule(value)) {
    throw new Error("un composant d'état doit être exporté")
  }
  return value
}

function errorOf(value: unknown): ErrorModule {
  if (!isErrorModule(value)) {
    throw new Error("une frontière d'erreur doit être exportée")
  }
  return value
}

afterEach(() => {
  cleanup()
  vi.resetModules()
})

async function expectLoadingErrorAndNotFound(
  loadingModule: unknown,
  errorModule: unknown,
  notFoundModule: unknown,
  resourceLabel: RegExp,
  returnHref: string,
): Promise<void> {
  render(componentOf(loadingModule).default())
  expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
  cleanup()

  const reset = vi.fn()
  render(
    errorOf(errorModule).default({
      error: new Error("SENTINELLE INTERNE"),
      reset,
    }),
  )
  expect(screen.getByRole("alert")).not.toHaveTextContent("SENTINELLE INTERNE")
  fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
  expect(reset).toHaveBeenCalledOnce()
  cleanup()

  render(componentOf(notFoundModule).default())
  expect(screen.getByRole("main")).toHaveTextContent(resourceLabel)
  expect(screen.getByRole("link", { name: /retour/i })).toHaveAttribute(
    "href",
    returnHref,
  )
}

describe("états explicites des écrans répliqués", () => {
  it(
    scenario(
      "La liste Formations expose loading, error et empty en plus du succès",
      "les frontières de liste et un service qui retourne zéro formation",
      "les trois états sont rendus",
      "loading annonce le chargement, error reste générique avec réessayer, et empty annonce qu'aucune formation ne correspond",
    ),
    async () => {
      const loading = componentOf(
        await import("@/app/(public)/formations/loading"),
      )
      render(loading.default())
      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
      cleanup()

      const reset = vi.fn()
      const error = errorOf(await import("@/app/(public)/formations/error"))
      render(error.default({ error: new Error("SECRET"), reset }))
      expect(screen.getByRole("alert")).not.toHaveTextContent("SECRET")
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledOnce()
      cleanup()

      vi.doMock("@/server/services/formation-service", () => ({
        getFormations: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
      }))
      const page: unknown = await import("@/app/(public)/formations/page")
      if (!isRecord(page) || typeof page.default !== "function") {
        throw new Error("la page Formations doit être exportée")
      }
      render(await page.default({ searchParams: Promise.resolve({}) }))
      expect(screen.getByRole("main")).toHaveTextContent(/aucune formation/i)
    },
  )

  it(
    scenario(
      "La liste Opportunités expose loading, error et empty en plus du succès",
      "les frontières de liste et un service qui retourne zéro opportunité",
      "les trois états sont rendus",
      "loading annonce le chargement, error reste générique avec réessayer, et empty annonce qu'aucune opportunité ne correspond",
    ),
    async () => {
      render(
        componentOf(
          await import("@/app/(public)/opportunites/loading"),
        ).default(),
      )
      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
      cleanup()
      const reset = vi.fn()
      render(
        errorOf(await import("@/app/(public)/opportunites/error")).default({
          error: new Error("SECRET"),
          reset,
        }),
      )
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledOnce()
      cleanup()
      vi.doMock("@/server/services/opportunite-service", () => ({
        getOpportunites: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
      }))
      const page: unknown = await import("@/app/(public)/opportunites/page")
      if (!isRecord(page) || typeof page.default !== "function") {
        throw new Error("la page Opportunités doit être exportée")
      }
      render(await page.default({ searchParams: Promise.resolve({}) }))
      expect(screen.getByRole("main")).toHaveTextContent(/aucune opportunité/i)
    },
  )

  it(
    scenario(
      "Le détail Formation expose loading, error et not-found en plus du succès",
      "les trois frontières du détail Formation",
      "elles sont rendues séparément",
      "elles annoncent chargement, erreur générique réessayable et formation introuvable avec retour à la liste",
    ),
    async () => {
      await expectLoadingErrorAndNotFound(
        await import("@/app/(public)/formations/[slug]/loading"),
        await import("@/app/(public)/formations/[slug]/error"),
        await import("@/app/(public)/formations/[slug]/not-found"),
        /formation.*introuvable|aucune formation/i,
        "/formations",
      )
    },
  )

  it(
    scenario(
      "Le détail Opportunité expose loading, error et not-found en plus du succès",
      "les trois frontières du détail Opportunité",
      "elles sont rendues séparément",
      "elles annoncent chargement, erreur générique réessayable et opportunité introuvable avec retour à la liste",
    ),
    async () => {
      await expectLoadingErrorAndNotFound(
        await import("@/app/(public)/opportunites/[slug]/loading"),
        await import("@/app/(public)/opportunites/[slug]/error"),
        await import("@/app/(public)/opportunites/[slug]/not-found"),
        /opportunité.*introuvable|aucune opportunité/i,
        "/opportunites",
      )
    },
  )
})
