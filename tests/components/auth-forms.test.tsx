import { createElement, type ComponentType } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type FormModule = {
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

function isFormModule(value: unknown): value is FormModule {
  return isRecord(value) && typeof value.default === "function"
}

function loadForm(module: unknown, path: string): ComponentType {
  if (!isFormModule(module)) {
    throw new Error(`${path} doit exporter un formulaire par défaut`)
  }
  return module.default
}

describe("formulaires d'authentification accessibles sur mobile", () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it(
    scenario(
      "Le formulaire de connexion expose des contrôles accessibles et tactiles",
      "un visiteur sur la page de connexion vide",
      "le formulaire Login est rendu",
      "l'e-mail et le mot de passe ont des labels, le secret utilise autocomplete current-password et le bouton mesure au moins 44px",
    ),
    async () => {
      const module: unknown = await vi.importActual(
        "@/components/features/auth/login-form",
      )
      const LoginForm = loadForm(
        module,
        "@/components/features/auth/login-form",
      )
      render(createElement(LoginForm))

      expect(screen.getByLabelText(/e-mail|email/i)).toHaveAttribute(
        "autocomplete",
        "email",
      )
      expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute(
        "autocomplete",
        "current-password",
      )
      expect(
        screen.getByRole("button", { name: /connexion|se connecter/i }),
      ).toHaveClass("min-h-touch")
    },
  )

  it(
    scenario(
      "La première étape d'inscription expose la règle de 12 caractères et une cible tactile",
      "un visiteur sur la première étape d'inscription vide",
      "le formulaire Register est rendu",
      "e-mail et nouveau mot de passe sont labellisés, la règle des 12 caractères est annoncée et le bouton de progression mesure au moins 44px",
    ),
    async () => {
      const module: unknown = await vi.importActual(
        "@/components/features/auth/register-form",
      )
      const RegisterForm = loadForm(
        module,
        "@/components/features/auth/register-form",
      )
      render(createElement(RegisterForm))

      expect(screen.getByLabelText(/e-mail|email/i)).toHaveAttribute(
        "autocomplete",
        "email",
      )
      expect(screen.getByLabelText(/mot de passe/i)).toHaveAttribute(
        "autocomplete",
        "new-password",
      )
      expect(screen.getByText(/12 caractères/i)).toBeInTheDocument()
      expect(screen.getByRole("button")).toHaveClass("min-h-touch")
    },
  )

  it(
    scenario(
      "Le formulaire de changement de mot de passe demande l'ancien et le nouveau secret",
      "un membre connecté sur son compte",
      "le formulaire Change password est rendu",
      "deux champs distincts et labellisés portent les bons autocomplete et le bouton de mutation mesure au moins 44px",
    ),
    async () => {
      const module: unknown = await vi.importActual(
        "@/components/features/auth/change-password-form",
      )
      const ChangePasswordForm = loadForm(
        module,
        "@/components/features/auth/change-password-form",
      )
      render(createElement(ChangePasswordForm))

      expect(screen.getByLabelText(/ancien mot de passe/i)).toHaveAttribute(
        "autocomplete",
        "current-password",
      )
      expect(screen.getByLabelText(/nouveau mot de passe/i)).toHaveAttribute(
        "autocomplete",
        "new-password",
      )
      expect(
        screen.getByRole("button", { name: /changer|modifier/i }),
      ).toHaveClass("min-h-touch")
    },
  )
})
