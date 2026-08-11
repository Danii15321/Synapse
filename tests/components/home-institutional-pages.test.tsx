import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type PageModule = {
  default: () => ReactNode | Promise<ReactNode>
}

type ErrorModule = {
  default: (props: Readonly<{ error: Error; reset: () => void }>) => ReactNode
}

const HOME_DATA = {
  recent: [
    {
      href: "/prompts/prompt-recent",
      id: "prompt-recent",
      rubric: "Prompts",
      summary: "Un résumé récent sans corps premium.",
      title: "Un prompt récent",
    },
  ],
  sections: [
    { count: 24, href: "/prompts", key: "prompts", title: "Prompts" },
    {
      count: 3,
      href: "/formations",
      key: "formations",
      title: "Formations",
    },
    {
      count: 2,
      href: "/jeux",
      key: "jeux",
      title: "Jeux & concours",
    },
    {
      count: 5,
      href: "/opportunites",
      key: "opportunites",
      title: "Bons plans & opportunités",
    },
  ],
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

function isPageModule(value: unknown): value is PageModule {
  return isRecord(value) && typeof value.default === "function"
}

function isErrorModule(value: unknown): value is ErrorModule {
  return isRecord(value) && typeof value.default === "function"
}

async function loadPage(path: string): Promise<PageModule> {
  const module: unknown = await import(path)
  if (!isPageModule(module)) throw new Error(`${path} doit exporter une page`)
  return module
}

describe("accueil et pages institutionnelles", () => {
  afterEach(() => {
    cleanup()
    vi.doUnmock("@/server/services/home-service")
    vi.resetModules()
  })

  it(
    scenario(
      "L'accueil explique Synapse et ouvre les quatre rubriques",
      "le service retourne quatre compteurs réels et un contenu récent",
      "le Server Component d'accueil est rendu",
      "le titre et la mission issue du README restent présents sans l'ancienne accroche, avec les quatre liens chiffrés, la mise en avant et l'appel premium",
    ),
    async () => {
      vi.doMock("@/server/services/home-service", () => ({
        getHomePageData: vi.fn().mockResolvedValue(HOME_DATA),
      }))
      const page = await loadPage("@/app/page")
      render(await page.default())

      expect(
        screen.getByRole("heading", { level: 1, name: /synapse.*action/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole("main")).toHaveTextContent(
        /accompagnement.*formation.*jeunes ivoiriens/i,
      )
      expect(screen.getByRole("main")).not.toHaveTextContent(
        "Apprendre. Créer. Avancer.",
      )
      expect(screen.getByRole("main")).toHaveTextContent(
        /intelligence artificielle/i,
      )
      expect(screen.getByRole("main")).toHaveTextContent(/entrepreneuriat/i)
      for (const section of HOME_DATA.sections) {
        const link = screen.getByRole("link", {
          name: new RegExp(`${section.title}.*${section.count}`, "i"),
        })
        expect(link).toHaveAttribute("href", section.href)
      }
      expect(
        screen.getByRole("heading", { name: "Un prompt récent" }),
      ).toBeInTheDocument()
      expect(
        screen.getByRole("link", {
          name: /premium|accès à vie|devenir membre/i,
        }),
      ).toHaveAttribute("href", "/premium")
    },
  )

  it(
    scenario(
      "L'accueil vide conserve ses entrées sans inventer de contenu",
      "le service retourne les quatre compteurs à zéro et aucun contenu récent",
      "le Server Component d'accueil est rendu",
      "les quatre rubriques restent accessibles avec 0 et un message explicite remplace les cartes récentes",
    ),
    async () => {
      vi.doMock("@/server/services/home-service", () => ({
        getHomePageData: vi.fn().mockResolvedValue({
          recent: [],
          sections: HOME_DATA.sections.map((section) => ({
            ...section,
            count: 0,
          })),
        }),
      }))
      const page = await loadPage("@/app/page")
      render(await page.default())

      expect(screen.getAllByText(/^0$/)).toHaveLength(4)
      expect(
        screen.getByText(/aucun contenu récent|bientôt/i),
      ).toBeInTheDocument()
      expect(screen.queryAllByRole("article")).toHaveLength(0)
    },
  )

  it(
    scenario(
      "L'accueil possède des états loading et error accessibles",
      "une navigation pendant le chargement puis une erreur serveur avec reset",
      "les deux frontières racine sont rendues et l'action de reprise est activée",
      "un statut annonce le chargement, puis une alerte française propose réessayer et un retour à l'accueil",
    ),
    async () => {
      const loading = await loadPage("@/app/loading")
      render(await loading.default())
      expect(screen.getByRole("status")).toHaveTextContent(/chargement/i)
      cleanup()

      const module: unknown = await import("@/app/error")
      if (!isErrorModule(module)) {
        throw new Error("la frontière racine doit exporter un composant error")
      }
      const reset = vi.fn()
      render(module.default({ error: new Error("interne"), reset }))
      expect(screen.getByRole("alert")).toHaveTextContent(/erreur/i)
      expect(screen.getByRole("link", { name: /accueil/i })).toHaveAttribute(
        "href",
        "/",
      )
      fireEvent.click(screen.getByRole("button", { name: /réessayer/i }))
      expect(reset).toHaveBeenCalledTimes(1)
    },
  )

  it(
    scenario(
      "À propos reprend fidèlement le positionnement du README",
      "les faits produit validés sur Synapse et ses trois thématiques historiques",
      "la page À propos est rendue",
      "elle cite les jeunes ivoiriens, orientation académique, IA et entrepreneuriat, puis explique le recentrage de la plateforme",
    ),
    async () => {
      const page = await loadPage("@/app/(public)/a-propos/page")
      render(await page.default())

      const main = screen.getByRole("main")
      expect(main).toHaveTextContent(/jeunes ivoiriens/i)
      expect(main).toHaveTextContent(/orientation académique/i)
      expect(main).toHaveTextContent(/intelligence artificielle/i)
      expect(main).toHaveTextContent(/entrepreneuriat/i)
      expect(main).toHaveTextContent(/autres canaux|hors.*périmètre/i)
    },
  )

  it(
    scenario(
      "Contact reste atteignable sans inventer de canal public",
      "aucune coordonnée publique ni aucun canal de contact n'a été validé",
      "la page Contact est rendue",
      "elle explique honnêtement l'absence de canal public sans placeholder, WhatsApp, numéro, e-mail, réseau social ni formulaire",
    ),
    async () => {
      const page = await loadPage("@/app/(public)/contact/page")
      const rendered = render(await page.default())

      const main = screen.getByRole("main")
      expect(main).toHaveTextContent(/aucun canal.*public.*validé/i)
      expect(main).not.toHaveTextContent(
        /À compléter|WhatsApp|e-mail|email|réseaux sociaux/i,
      )
      expect(main).not.toHaveTextContent(/\+33\s*6\s*68\s*82\s*30\s*12/u)
      expect(rendered.container.querySelector("form")).toBeNull()
    },
  )

  it(
    scenario(
      "Les trois pages d'information retirent les champs juridiques non fournis",
      "E12-01 valide uniquement les faits du README et du comportement réel de la v1",
      "Mentions légales, Confidentialité et Conditions d'utilisation sont rendues",
      "elles décrivent seulement la plateforme, les données réellement traitées et les limites v1 sans gabarit, placeholder, identité, adresse, responsable, juridiction ni coordonnée inventée",
    ),
    async () => {
      const pages = [
        [
          "@/app/(public)/mentions-legales/page",
          /Synapse.*plateforme|plateforme.*Synapse/i,
        ],
        [
          "@/app/(public)/confidentialite/page",
          /adresse e-mail.*mot de passe|mot de passe.*adresse e-mail/i,
        ],
        [
          "@/app/(public)/conditions-utilisation/page",
          /accès gratuit.*premium|premium.*accès gratuit/i,
        ],
      ] as const

      for (const [path, expectedStructure] of pages) {
        const page = await loadPage(path)
        const rendered = render(await page.default())
        const main = screen.getAllByRole("main").at(-1)
        expect(main).toHaveTextContent(expectedStructure)
        expect(main).not.toHaveTextContent(
          /À compléter|gabarit juridique|raison sociale|adresse postale|responsable de publication|juridiction|droit applicable/i,
        )
        expect(main).not.toHaveTextContent(/\+33\s*6\s*68\s*82\s*30\s*12/u)
        rendered.unmount()
      }
    },
  )

  it(
    scenario(
      "La page 404 habillée n'est plus une impasse",
      "un visiteur arrive sur une URL inexistante",
      "not-found est rendu",
      "un message français donne accès à l'accueil et aux quatre rubriques",
    ),
    async () => {
      const page = await loadPage("@/app/not-found")
      render(await page.default())

      expect(
        screen.getByRole("heading", { name: /introuvable/i }),
      ).toBeInTheDocument()
      for (const [name, href] of [
        ["Accueil", "/"],
        ["Prompts", "/prompts"],
        ["Formations", "/formations"],
        ["Jeux & concours", "/jeux"],
        ["Opportunités", "/opportunites"],
      ]) {
        expect(
          screen.getByRole("link", { name: new RegExp(name ?? "", "i") }),
        ).toHaveAttribute("href", href)
      }
    },
  )
})
