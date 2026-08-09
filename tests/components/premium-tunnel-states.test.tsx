import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type ComponentModule = Readonly<{ default: () => ReactNode }>
type ErrorModule = Readonly<{
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
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

function isComponentFunction(
  value: unknown,
): value is ComponentModule["default"] {
  return typeof value === "function"
}

function isErrorFunction(value: unknown): value is ErrorModule["default"] {
  return typeof value === "function"
}

function componentOf(value: unknown): ComponentModule {
  if (!isRecord(value) || !isComponentFunction(value.default)) {
    throw new Error("la frontière loading premium doit être exportée")
  }
  return { default: value.default }
}

function errorOf(value: unknown): ErrorModule {
  if (!isRecord(value) || !isErrorFunction(value.default)) {
    throw new Error("la frontière error premium doit être exportée")
  }
  return { default: value.default }
}

afterEach(() => {
  cleanup()
  vi.resetModules()
})

describe("états applicables de l'offre premium publique", () => {
  it(
    scenario(
      "Le chargement des volumes réels est annoncé sans masquer l'état",
      "la frontière loading de /premium sur viewport mobile",
      "le composant est rendu avant la réponse serveur",
      "un status accessible annonce explicitement le chargement de l'offre premium",
    ),
    async () => {
      const modulePath = "@/app/(public)/premium/loading"
      const loading = componentOf(await import(modulePath))

      render(loading.default())

      expect(screen.getByRole("status")).toHaveTextContent(
        /chargement.*premium|premium.*chargement/i,
      )
    },
  )

  it(
    scenario(
      "Une erreur de chargement reste générique et permet de réessayer",
      "une erreur serveur contenant une sentinelle interne et la frontière error de /premium",
      "l'écran d'erreur est rendu puis son action est activée",
      "la sentinelle n'est pas affichée, une alerte claire est visible et reset est appelé une fois",
    ),
    async () => {
      const reset = vi.fn()
      const modulePath = "@/app/(public)/premium/error"
      const error = errorOf(await import(modulePath))

      render(error.default({ error: new Error("SECRET-PRISMA-T10"), reset }))

      expect(screen.getByRole("alert")).not.toHaveTextContent(
        "SECRET-PRISMA-T10",
      )
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledOnce()
    },
  )
})
