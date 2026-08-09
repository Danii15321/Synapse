import type { ComponentType } from "react"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

type ParticipationControlProps = Readonly<{
  activityType: "FORMATION" | "JEU"
  initialState:
    "ALREADY_REGISTERED" | "AVAILABLE" | "CLOSED" | "FULL" | "PREMIUM_REQUIRED"
  location: string | null
  slug: string
  startsAt: string | null
}>

type ParticipationControlModule = Readonly<{
  default: ComponentType<ParticipationControlProps>
}>

function isParticipationControlModule(
  value: unknown,
): value is ParticipationControlModule {
  return isRecord(value) && typeof value.default === "function"
}

function componentOf(value: unknown): ParticipationControlModule {
  if (!isParticipationControlModule(value)) {
    throw new Error("participation-control doit exporter son composant")
  }
  return value
}

const BASE_PROPS: ParticipationControlProps = {
  activityType: "JEU",
  initialState: "AVAILABLE",
  location: "Abidjan, Cocody",
  slug: "challenge",
  startsAt: "2026-12-12T10:00:00.000Z",
}

afterEach(() => {
  cleanup()
  vi.doUnmock("@/lib/api")
  vi.resetModules()
})

describe("contrôle de participation mobile", () => {
  const staticStates: ReadonlyArray<
    readonly [ParticipationControlProps["initialState"], RegExp]
  > = [
    ["PREMIUM_REQUIRED", /réservé.*membre|devenir membre/i],
    ["CLOSED", /participations? closes?/i],
    ["FULL", /complet|plus de place/i],
    ["ALREADY_REGISTERED", /participation confirmée|déjà inscrit/i],
  ]

  it.each(staticStates)(
    scenario(
      "L'état %s est explicite et ne propose pas une nouvelle soumission",
      "un contrôle initialisé dans l'état métier %s",
      "le composant est rendu sur mobile",
      "le message attendu est visible et aucun bouton Je participe actif n'est proposé",
    ),
    async (initialState, expectedMessage) => {
      const component = componentOf(
        await import("@/components/features/participation-control"),
      )
      const Control = component.default
      render(<Control {...BASE_PROPS} initialState={initialState} />)

      expect(screen.getByText(expectedMessage)).toBeVisible()
      expect(
        screen.queryByRole("button", { name: /^je participe$/i }),
      ).not.toBeInTheDocument()
    },
  )

  it(
    scenario(
      "Le bouton se désactive pendant l'appel et empêche la double soumission",
      "une activité disponible et une requête API maintenue en attente",
      "le membre clique deux fois rapidement sur Je participe",
      "le contrôle passe en inscription en cours, le bouton est désactivé et une seule requête part",
    ),
    async () => {
      let resolveRequest: ((value: unknown) => void) | undefined
      const createJeuParticipation = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveRequest = resolve
          }),
      )
      vi.doMock("@/lib/api", () => ({ createJeuParticipation }))
      const component = componentOf(
        await import("@/components/features/participation-control"),
      )
      const Control = component.default
      render(<Control {...BASE_PROPS} />)
      const button = screen.getByRole("button", { name: /^je participe$/i })

      fireEvent.click(button)
      fireEvent.click(button)

      expect(button).toBeDisabled()
      expect(screen.getByRole("status")).toHaveTextContent(/en cours/i)
      expect(createJeuParticipation).toHaveBeenCalledTimes(1)
      resolveRequest?.({
        emailConfirmation: false,
        location: BASE_PROPS.location,
        startsAt: BASE_PROPS.startsAt,
        status: "CREATED",
        title: "Challenge",
      })
      await waitFor(() =>
        expect(screen.getByText(/participation confirmée/i)).toBeVisible(),
      )
    },
  )

  it(
    scenario(
      "La confirmation explique la suite hors plateforme sans promettre d'e-mail",
      "une participation créée avec date et lieu",
      "la réponse API de succès est affichée",
      "Participation confirmée, date, lieu, absence d'e-mail et Annuler ma participation sont tous visibles",
    ),
    async () => {
      vi.doMock("@/lib/api", () => ({
        createJeuParticipation: vi.fn().mockResolvedValue({
          emailConfirmation: false,
          location: "Abidjan, Cocody",
          startsAt: "2026-12-12T10:00:00.000Z",
          status: "CREATED",
          title: "Challenge",
        }),
      }))
      const component = componentOf(
        await import("@/components/features/participation-control"),
      )
      const Control = component.default
      render(<Control {...BASE_PROPS} />)

      fireEvent.click(screen.getByRole("button", { name: /^je participe$/i }))

      expect(await screen.findByText(/participation confirmée/i)).toBeVisible()
      expect(screen.getByText(/abidjan.*cocody/i)).toBeVisible()
      expect(screen.getByText(/12.*2026|2026.*12/i)).toBeVisible()
      expect(screen.getByText(/aucun e-mail|pas d.e-mail/i)).toBeVisible()
      expect(
        screen.getByRole("button", { name: /annuler ma participation/i }),
      ).toBeVisible()
    },
  )
})
