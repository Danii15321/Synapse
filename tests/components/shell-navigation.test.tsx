import { createElement, type ComponentType, type ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type NavigationProps = Readonly<{
  authenticated: boolean
  membership: "FREE" | "PREMIUM" | null
}>

type NavigationModule = {
  SiteNavigation: ComponentType<NavigationProps>
}

type PageModule = {
  default: () => ReactNode | Promise<ReactNode>
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

function isNavigationModule(value: unknown): value is NavigationModule {
  return isRecord(value) && typeof value.SiteNavigation === "function"
}

function isPageModule(value: unknown): value is PageModule {
  return isRecord(value) && typeof value.default === "function"
}

async function loadNavigation(): Promise<NavigationModule> {
  const module: unknown = await import("@/components/site-navigation")
  if (!isNavigationModule(module)) {
    throw new Error("site-navigation doit exporter SiteNavigation")
  }
  return module
}

describe("navigation et footer du shell", () => {
  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it(
    scenario(
      "Le menu mobile est entièrement utilisable au clavier",
      "un visiteur anonyme sur un viewport étroit avec le bouton de menu focalisé",
      "il ouvre le menu, parcourt ses limites avec Tab puis appuie sur Échap",
      "le menu expose les quatre rubriques, piège le focus, se ferme et rend le focus au bouton",
    ),
    async () => {
      const { SiteNavigation } = await loadNavigation()
      render(
        createElement(SiteNavigation, {
          authenticated: false,
          membership: null,
        }),
      )
      const toggle = screen.getByRole("button", { name: /ouvrir.*menu|menu/i })
      toggle.focus()

      fireEvent.click(toggle)

      expect(toggle).toHaveAttribute("aria-expanded", "true")
      const controlledId = toggle.getAttribute("aria-controls")
      expect(controlledId).toBeTruthy()
      const menu = controlledId ? document.getElementById(controlledId) : null
      expect(menu).not.toBeNull()
      if (!menu) throw new Error("le bouton doit contrôler le menu mobile")

      for (const entry of [
        ["Prompts", "/prompts"],
        ["Formations", "/formations"],
        ["Jeux & concours", "/jeux"],
        ["Bons plans & opportunités", "/opportunites"],
      ]) {
        expect(
          screen.getByRole("link", { name: new RegExp(entry[0] ?? "", "i") }),
        ).toHaveAttribute("href", entry[1])
      }

      const focusable = Array.from(
        menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      )
      expect(focusable.length).toBeGreaterThanOrEqual(5)
      expect(focusable[0]).toHaveFocus()

      focusable[0]?.focus()
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
      expect(focusable.at(-1)).toHaveFocus()

      focusable.at(-1)?.focus()
      fireEvent.keyDown(document, { key: "Tab" })
      expect(focusable[0]).toHaveFocus()

      fireEvent.keyDown(document, { key: "Escape" })
      expect(toggle).toHaveAttribute("aria-expanded", "false")
      expect(toggle).toHaveFocus()
    },
  )

  it(
    scenario(
      "Un tap extérieur ferme le menu mobile",
      "le menu mobile ouvert par un visiteur",
      "un événement pointerdown survient en dehors du header",
      "le panneau se ferme sans déclencher une navigation",
    ),
    async () => {
      const { SiteNavigation } = await loadNavigation()
      render(
        createElement(SiteNavigation, {
          authenticated: false,
          membership: null,
        }),
      )
      const toggle = screen.getByRole("button", { name: /ouvrir.*menu|menu/i })
      fireEvent.click(toggle)
      expect(toggle).toHaveAttribute("aria-expanded", "true")

      fireEvent.pointerDown(document.body)

      expect(toggle).toHaveAttribute("aria-expanded", "false")
    },
  )

  it(
    scenario(
      "La navigation reflète la session et l'adhésion",
      "un visiteur anonyme, un membre FREE puis un membre PREMIUM",
      "le même header serveur reçoit chacun de ces états",
      "Connexion n'apparaît que pour l'anonyme, Compte pour les membres et le Badge premium uniquement pour PREMIUM",
    ),
    async () => {
      const { SiteNavigation } = await loadNavigation()
      const rendered = render(
        createElement(SiteNavigation, {
          authenticated: false,
          membership: null,
        }),
      )
      expect(screen.getByRole("link", { name: /connexion/i })).toHaveAttribute(
        "href",
        "/login",
      )
      expect(screen.queryByRole("link", { name: /compte/i })).toBeNull()

      rendered.rerender(
        createElement(SiteNavigation, {
          authenticated: true,
          membership: "FREE",
        }),
      )
      expect(screen.getByRole("link", { name: /compte/i })).toHaveAttribute(
        "href",
        "/compte",
      )
      expect(
        screen.getByText(/membre gratuit|accès gratuit/i),
      ).toBeInTheDocument()
      expect(screen.queryByText(/^premium$/i)).toBeNull()

      rendered.rerender(
        createElement(SiteNavigation, {
          authenticated: true,
          membership: "PREMIUM",
        }),
      )
      expect(screen.getByText(/^premium$/i)).toBeInTheDocument()
      expect(screen.queryByRole("link", { name: /connexion/i })).toBeNull()
    },
  )

  it(
    scenario(
      "Le footer donne accès aux cinq pages institutionnelles",
      "le footer partagé rendu sur n'importe quelle page",
      "ses liens et mentions sont lus",
      "À propos, Contact, Mentions légales, Confidentialité et Conditions d'utilisation sont liés, avec le premium et l'année courante",
    ),
    async () => {
      const modulePath = "@/components/site-footer"
      const module: unknown = await import(modulePath)
      if (!isPageModule(module)) {
        throw new Error("site-footer doit exporter un composant par défaut")
      }
      render(await module.default())

      const links = [
        ["À propos", "/a-propos"],
        ["Contact", "/contact"],
        ["Mentions légales", "/mentions-legales"],
        ["Confidentialité", "/confidentialite"],
        ["Conditions d'utilisation", "/conditions-utilisation"],
      ]
      for (const [name, href] of links) {
        expect(
          screen.getByRole("link", { name: new RegExp(name ?? "", "i") }),
        ).toHaveAttribute("href", href)
      }
      expect(screen.getByText(/premium|accès à vie/i)).toBeInTheDocument()
      expect(
        screen.getByText(String(new Date().getFullYear())),
      ).toBeInTheDocument()
    },
  )
})
