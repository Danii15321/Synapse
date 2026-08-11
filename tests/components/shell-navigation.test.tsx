import { createElement, type ComponentType, type ReactNode } from "react"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
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
      "le menu expose les quatre rubriques et la connexion secondaire, piège le focus, se ferme et rend le focus au bouton",
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
        ["Connexion", "/login"],
      ]) {
        expect(
          within(menu).getByRole("link", {
            name: new RegExp(entry[0] ?? "", "i"),
          }),
        ).toHaveAttribute("href", entry[1])
      }

      const focusable = Array.from(
        menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      )
      expect(focusable.length).toBeGreaterThanOrEqual(6)
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
      "l'anonyme voit dans l'ordre hamburger, marque et Devenir membre avec Connexion dans le panneau, tandis que les membres voient Compte et leur statut sans bouton Déconnexion dans le header",
    ),
    async () => {
      const { SiteNavigation } = await loadNavigation()
      const rendered = render(
        createElement(SiteNavigation, {
          authenticated: false,
          membership: null,
        }),
      )
      const navigation = screen.getByRole("navigation", {
        name: /navigation principale/i,
      })
      const toggle = screen.getByRole("button", {
        name: "Ouvrir le menu",
      })
      const brand = screen.getByRole("link", { name: /synapse.*accueil/i })
      const membershipCallToAction = screen.getByRole("link", {
        name: "Devenir membre",
      })
      expect(membershipCallToAction).toHaveAttribute("href", "/premium")
      expect(toggle).not.toHaveTextContent(/menu/i)
      expect(toggle.querySelectorAll("svg line")).toHaveLength(3)

      const menuContainer = toggle.parentElement
      const sessionContainer = membershipCallToAction.parentElement
      expect(menuContainer?.parentElement).toBe(navigation)
      expect(brand.parentElement).toBe(navigation)
      expect(sessionContainer?.parentElement).toBe(navigation)
      expect(Array.from(navigation.children)).toEqual([
        menuContainer,
        brand,
        sessionContainer,
      ])

      fireEvent.click(toggle)
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
      expect(screen.queryByRole("link", { name: /devenir membre/i })).toBeNull()
      expect(
        screen.queryByRole("button", { name: /déconnexion|se déconnecter/i }),
      ).toBeNull()
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
      "Le footer ne rend que Contact et À propos",
      "le footer partagé rendu sur n'importe quelle page",
      "ses liens et son contenu textuel sont recensés",
      "Contact et À propos sont les deux seuls liens et aucun texte descriptif, offre membre, copyright, rubrique ou lien légal n'est rendu",
    ),
    async () => {
      const modulePath = "@/components/site-footer"
      const module: unknown = await import(modulePath)
      if (!isPageModule(module)) {
        throw new Error("site-footer doit exporter un composant par défaut")
      }
      render(await module.default())

      const footer = screen.getByRole("contentinfo")
      const actualLinks = within(footer)
        .getAllByRole("link")
        .map((link) => ({
          href: link.getAttribute("href"),
          label: link.textContent?.trim() ?? "",
        }))
        .sort((left, right) => left.label.localeCompare(right.label, "fr"))
      const expectedLinks = [
        { href: "/a-propos", label: "À propos" },
        { href: "/contact", label: "Contact" },
      ].sort((left, right) => left.label.localeCompare(right.label, "fr"))

      expect(actualLinks).toEqual(expectedLinks)

      const footerWithoutLinks = footer.cloneNode(true)
      if (!(footerWithoutLinks instanceof HTMLElement)) {
        throw new Error("le footer cloné doit rester un élément HTML")
      }
      footerWithoutLinks.querySelectorAll("a").forEach((link) => link.remove())
      expect(footerWithoutLinks.textContent?.replace(/\s+/g, " ").trim()).toBe(
        "",
      )
    },
  )
})
