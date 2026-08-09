import type { ReactNode } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

type AccountPage = Readonly<{
  default: (props: {
    searchParams: Promise<Record<string, string>>
  }) => Promise<ReactNode> | ReactNode
}>

function isAccountPage(value: unknown): value is AccountPage {
  return isRecord(value) && typeof value.default === "function"
}

function pageOf(value: unknown): AccountPage {
  if (!isAccountPage(value)) {
    throw new Error("la page Compte doit être exportée")
  }
  return value
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/server")
  vi.doUnmock("@/server/services/inscription-service")
  vi.resetModules()
})

describe("liste Mes participations du compte", () => {
  it(
    scenario(
      "Le compte retrouve jeux et formations événementielles avec leur suite pratique",
      "un membre qui participe à un concours et à une formation événementielle",
      "la page /compte charge Mes participations",
      "chaque activité affiche type, titre, date, lieu ou modalité et l'action Annuler ma participation, sans auteur ni données de tiers",
    ),
    async () => {
      const user = {
        email: "member@example.test",
        id: "member",
        membership: "FREE",
      }
      vi.doMock("@/server", () => ({
        getAccount: vi.fn().mockReturnValue(user),
        requireUser: vi.fn().mockResolvedValue(user),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        getMyParticipations: vi.fn().mockResolvedValue({
          items: [
            {
              activityType: "JEU",
              location: "Abidjan, Cocody",
              slug: "challenge",
              startsAt: "2026-12-12T10:00:00.000Z",
              title: "Challenge entrepreneurial",
            },
            {
              activityType: "FORMATION",
              location: "En ligne",
              slug: "atelier",
              startsAt: "2026-12-20T15:00:00.000Z",
              title: "Atelier pitch",
            },
          ],
          nextCursor: null,
        }),
      }))
      const page = pageOf(await import("@/app/(member)/compte/page"))

      render(await page.default({ searchParams: Promise.resolve({}) }))

      expect(
        screen.getByRole("heading", { name: /mes participations/i }),
      ).toBeVisible()
      expect(screen.getByText("Challenge entrepreneurial")).toBeVisible()
      expect(screen.getByText("Atelier pitch")).toBeVisible()
      expect(screen.getByText(/abidjan.*cocody/i)).toBeVisible()
      expect(screen.getByText(/en ligne/i)).toBeVisible()
      expect(
        screen.getAllByRole("button", { name: /annuler ma participation/i }),
      ).toHaveLength(2)
      expect(document.body.textContent).not.toMatch(/victim|passwordHash/i)
    },
  )

  it(
    scenario(
      "Mes participations possède un état vide explicite",
      "un membre connecté sans aucune participation",
      "la page Compte reçoit une liste vide",
      "la section annonce qu'aucune participation n'est enregistrée sans afficher un écran cassé",
    ),
    async () => {
      const user = {
        email: "member@example.test",
        id: "member",
        membership: "FREE",
      }
      vi.doMock("@/server", () => ({
        getAccount: vi.fn().mockReturnValue(user),
        requireUser: vi.fn().mockResolvedValue(user),
      }))
      vi.doMock("@/server/services/inscription-service", () => ({
        getMyParticipations: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
      }))
      const page = pageOf(await import("@/app/(member)/compte/page"))

      render(await page.default({ searchParams: Promise.resolve({}) }))

      expect(
        screen.getByRole("heading", { name: /mes participations/i }),
      ).toBeVisible()
      expect(screen.getByText(/aucune participation/i)).toBeVisible()
    },
  )
})
