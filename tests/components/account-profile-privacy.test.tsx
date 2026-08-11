import { createElement, type ComponentType, type ReactNode } from "react"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithQueryClient } from "./query-client-test-utils"

type PageModule = Readonly<{
  default: (props: {
    searchParams: Promise<Record<string, string>>
  }) => Promise<ReactNode> | ReactNode
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

function pageOf(value: unknown): PageModule {
  if (!isRecord(value) || typeof value.default !== "function") {
    throw new Error("la page Compte doit exporter default")
  }
  return value as PageModule
}

function isFormModule(value: unknown): value is Readonly<{
  default: ComponentType
}> {
  return isRecord(value) && typeof value.default === "function"
}

const ACCOUNT = {
  city: "Abidjan",
  country: "Côte d'Ivoire",
  email: "awa@example.test",
  firstName: "Awa",
  id: "member-1",
  lastName: "Kouassi",
  membership: "FREE",
  phone: "+2250701020304",
  professionalLevel: "ETUDIANT",
} as const

afterEach(() => {
  cleanup()
  vi.doUnmock("@/lib/account-participations-server")
  vi.doUnmock("@/lib/api")
  vi.doUnmock("@/server")
  vi.resetModules()
})

describe("inscription enrichie et espace compte", () => {
  it(
    scenario(
      "L'inscription reste locale à l'étape 1 puis exige tout le profil à l'étape 2",
      "un formulaire vide et des appels register/login observés",
      "le visiteur valide e-mail et mot de passe, laisse un champ profil vide puis complète les six champs",
      "aucun appel réseau ne part avant la validation finale, les niveaux ont leurs quatre libellés français et register reçoit exactement les deux étapes complètes",
    ),
    async () => {
      const registerUser = vi.fn().mockResolvedValue({ message: "ok" })
      const loginUser = vi
        .fn()
        .mockImplementation(() => new Promise<never>(() => undefined))
      vi.doMock("@/lib/api", () => ({ loginUser, registerUser }))
      const module: unknown =
        await import("@/components/features/auth/register-form")
      if (!isFormModule(module)) {
        throw new Error("register-form doit exporter default")
      }
      const RegisterForm = module.default
      render(createElement(RegisterForm))

      fireEvent.change(screen.getByLabelText(/e-mail|email/i), {
        target: { value: "AWA@EXAMPLE.TEST" },
      })
      fireEvent.change(screen.getByLabelText(/^mot de passe/i), {
        target: { value: "MotDePasse!2026" },
      })
      fireEvent.click(screen.getByRole("button"))

      const firstName = await screen.findByLabelText(/^prénom$/i)
      expect(registerUser).not.toHaveBeenCalled()
      for (const label of ["Élève", "Étudiant", "Diplômé", "Autre"]) {
        expect(screen.getByText(label, { exact: true })).toBeVisible()
      }
      fireEvent.change(firstName, { target: { value: "Awa" } })
      fireEvent.change(screen.getByLabelText(/téléphone/i), {
        target: { value: "+2250701020304" },
      })
      fireEvent.change(screen.getByLabelText(/^ville$/i), {
        target: { value: "Abidjan" },
      })
      fireEvent.change(screen.getByLabelText(/^pays$/i), {
        target: { value: "Côte d'Ivoire" },
      })
      const level = screen.getByRole("combobox", {
        name: /niveau professionnel/i,
      })
      expect(
        within(level)
          .getAllByRole("option")
          .map((option) => {
            if (!(option instanceof HTMLOptionElement)) {
              throw new Error(
                "le niveau professionnel doit utiliser de vraies options HTML",
              )
            }
            return { label: option.textContent, value: option.value }
          }),
      ).toEqual([
        { label: "Élève", value: "ELEVE" },
        { label: "Étudiant", value: "ETUDIANT" },
        { label: "Diplômé", value: "DIPLOME" },
        { label: "Autre", value: "AUTRE" },
      ])
      fireEvent.change(level, { target: { value: "ETUDIANT" } })
      const form = firstName.closest("form")
      if (!form)
        throw new Error("les deux étapes doivent partager un formulaire")
      fireEvent.submit(form)
      await waitFor(() => expect(registerUser).not.toHaveBeenCalled())

      fireEvent.change(screen.getByLabelText(/^nom$/i), {
        target: { value: "Kouassi" },
      })
      fireEvent.submit(form)
      await waitFor(() =>
        expect(registerUser).toHaveBeenCalledWith({
          city: "Abidjan",
          country: "Côte d'Ivoire",
          email: "awa@example.test",
          firstName: "Awa",
          lastName: "Kouassi",
          password: "MotDePasse!2026",
          phone: "+2250701020304",
          professionalLevel: "ETUDIANT",
        }),
      )
    },
  )

  it(
    scenario(
      "La navigation Compte sépare strictement Mon profil et Confidentialité",
      "un membre FREE avec un profil public complet et aucune participation",
      "la vue par défaut Mon profil est rendue puis bascule en édition",
      "la navigation expose exactement deux destinations avec Mon profil courant, le service lit le DTO par userId, adhésion, profil, participations et déconnexion sont visibles, tandis que mot de passe et zone danger sont absents",
    ),
    async () => {
      const requireUser = vi.fn().mockResolvedValue({
        email: ACCOUNT.email,
        id: ACCOUNT.id,
        membership: ACCOUNT.membership,
      })
      const getAccount = vi.fn().mockResolvedValue(ACCOUNT)
      vi.doMock("@/server", () => ({ getAccount, requireUser }))
      vi.doMock("@/lib/account-participations-server", () => ({
        getMyParticipations: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
        waitForPendingParticipation: vi.fn(),
      }))
      const page = pageOf(await import("@/app/(member)/compte/page"))

      renderWithQueryClient(
        await page.default({ searchParams: Promise.resolve({}) }),
      )

      const main = screen.getByRole("main")
      const navigation = within(main).getByRole("navigation", {
        name: /compte/i,
      })
      const destinations = within(navigation).getAllByRole("link")
      expect(destinations).toHaveLength(2)
      expect(destinations.map((link) => link.textContent)).toEqual([
        "Mon profil",
        "Confidentialité",
      ])
      expect(
        within(navigation).getByRole("link", { name: "Mon profil" }),
      ).toHaveAttribute("aria-current", "page")
      expect(
        within(navigation).getByRole("link", { name: "Confidentialité" }),
      ).not.toHaveAttribute("aria-current")
      expect(requireUser).toHaveBeenCalledOnce()
      expect(getAccount).toHaveBeenCalledWith(ACCOUNT.id)

      expect(
        within(main).getByRole("heading", { name: "Mon profil" }),
      ).toBeVisible()
      expect(within(main).getByText("FREE", { exact: true })).toBeVisible()
      expect(
        within(main).getByRole("link", { name: /devenir membre/i }),
      ).toHaveAttribute("href", "/premium")
      expect(within(main).getByText(ACCOUNT.firstName)).toBeVisible()
      expect(
        within(main).queryByRole("textbox", { name: /^prénom$/i }),
      ).toBeNull()
      expect(within(main).queryByLabelText(/ancien mot de passe/i)).toBeNull()
      expect(
        within(main).queryByRole("heading", { name: /zone de danger/i }),
      ).toBeNull()

      fireEvent.click(within(main).getByRole("button", { name: "Modifier" }))
      expect(
        within(main).getByRole("textbox", { name: /^prénom$/i }),
      ).toHaveValue(ACCOUNT.firstName)
      expect(within(main).getByLabelText(/e-mail|email/i)).toHaveValue(
        ACCOUNT.email,
      )

      const buttons = within(main).getAllByRole("button")
      expect(buttons.at(-1)).toHaveAccessibleName(/déconnexion|se déconnecter/i)
    },
  )

  it(
    scenario(
      "La vue Confidentialité isole le mot de passe et la suppression du profil",
      "un membre FREE ouvre explicitement ?section=confidentialite",
      "la page rend la section privée puis déplie le formulaire de changement de mot de passe",
      "Confidentialité est la seule destination courante, mot de passe repliable et zone danger sont visibles, tandis qu'adhésion, profil, participations et déconnexion sont absents",
    ),
    async () => {
      vi.doMock("@/server", () => ({
        getAccount: vi.fn().mockResolvedValue(ACCOUNT),
        requireUser: vi.fn().mockResolvedValue({
          email: ACCOUNT.email,
          id: ACCOUNT.id,
          membership: ACCOUNT.membership,
        }),
      }))
      vi.doMock("@/lib/account-participations-server", () => ({
        getMyParticipations: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
        waitForPendingParticipation: vi.fn(),
      }))
      const page = pageOf(await import("@/app/(member)/compte/page"))

      renderWithQueryClient(
        await page.default({
          searchParams: Promise.resolve({ section: "confidentialite" }),
        }),
      )

      const main = screen.getByRole("main")
      const navigation = within(main).getByRole("navigation", {
        name: /compte/i,
      })
      expect(
        within(navigation).getByRole("link", { name: "Confidentialité" }),
      ).toHaveAttribute("aria-current", "page")
      expect(
        within(navigation).getByRole("link", { name: "Mon profil" }),
      ).not.toHaveAttribute("aria-current")
      expect(
        within(main).getByRole("heading", { name: "Confidentialité" }),
      ).toBeVisible()
      expect(within(main).queryByText("FREE", { exact: true })).toBeNull()
      expect(
        within(main).queryByRole("link", { name: /devenir membre/i }),
      ).toBeNull()
      expect(within(main).queryByText(ACCOUNT.firstName)).toBeNull()
      expect(within(main).queryByText(/participations/i)).toBeNull()
      expect(
        within(main).queryByRole("button", {
          name: /déconnexion|se déconnecter/i,
        }),
      ).toBeNull()

      expect(within(main).queryByLabelText(/ancien mot de passe/i)).toBeNull()
      fireEvent.click(
        within(main).getByRole("button", { name: /changer.*mot de passe/i }),
      )
      expect(within(main).getByLabelText(/ancien mot de passe/i)).toBeVisible()
      expect(within(main).getByLabelText(/nouveau mot de passe/i)).toBeVisible()

      const dangerHeading = within(main).getByRole("heading", {
        name: /zone de danger/i,
      })
      const danger = dangerHeading.closest("section")
      if (!danger) throw new Error("la zone de danger doit être une section")
      expect(
        within(danger).getByLabelText(/mot de passe.*actuel/i),
      ).toBeVisible()
      expect(
        within(danger).getByRole("button", { name: /supprimer.*compte/i }),
      ).toHaveClass("min-h-touch")
    },
  )

  it(
    scenario(
      "Le profil PREMIUM ne propose plus de devenir membre",
      "un membre PREMIUM avec son DTO public complet",
      "il ouvre la vue Mon profil",
      "l'accès à vie est visible et aucun CTA d'adhésion n'est rendu",
    ),
    async () => {
      vi.doMock("@/server", () => ({
        getAccount: vi
          .fn()
          .mockResolvedValue({ ...ACCOUNT, membership: "PREMIUM" }),
        requireUser: vi.fn().mockResolvedValue({
          email: ACCOUNT.email,
          id: ACCOUNT.id,
          membership: "PREMIUM",
        }),
      }))
      vi.doMock("@/lib/account-participations-server", () => ({
        getMyParticipations: vi
          .fn()
          .mockResolvedValue({ items: [], nextCursor: null }),
        waitForPendingParticipation: vi.fn(),
      }))
      const page = pageOf(await import("@/app/(member)/compte/page"))

      renderWithQueryClient(
        await page.default({ searchParams: Promise.resolve({}) }),
      )

      expect(screen.getByText(/accès à vie/i)).toBeVisible()
      expect(screen.queryByRole("link", { name: /devenir membre/i })).toBeNull()
    },
  )
})
