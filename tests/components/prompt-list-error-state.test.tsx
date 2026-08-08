import type { ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type ListPageModule = Readonly<{
  default: (
    props: Readonly<{
      searchParams: Promise<Record<string, string | string[] | undefined>>
    }>,
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

function isListPageModule(value: unknown): value is ListPageModule {
  return isRecord(value) && typeof value.default === "function"
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/server/services/prompt-service")
  vi.resetModules()
})

describe("état error serveur de la liste Prompts", () => {
  it(
    scenario(
      "Une query invalide rend un état error générique directement côté serveur",
      "un domaine hors enum dans les searchParams du Server Component et un service espion",
      "la page /prompts valide la query puis son résultat est rendu sans frontière cliente",
      "la page ne rejette pas, n'appelle pas le service et expose une alerte accessible sans domaine invalide, stack, Zod ni Prisma",
    ),
    async () => {
      const getPrompts = vi.fn().mockResolvedValue([])
      vi.doMock("@/server/services/prompt-service", () => ({ getPrompts }))
      const pageModule: unknown = await import("@/app/(public)/prompts/page")
      if (!isListPageModule(pageModule)) {
        throw new Error("la page /prompts doit exporter un Server Component")
      }

      const result = await pageModule.default({
        searchParams: Promise.resolve({ domain: "marketing" }),
      })
      expect(getPrompts).not.toHaveBeenCalled()
      render(result)

      const alert = screen.getByRole("alert")
      expect(alert).toBeInTheDocument()
      expect(alert).not.toHaveTextContent(/marketing|prisma|stack|zod/i)
    },
  )
})
