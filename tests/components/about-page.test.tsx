import type { ReactNode } from "react"

import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

type PageModule = Readonly<{
  default: () => ReactNode | Promise<ReactNode>
}>

const BLOCK_HEADINGS = [
  "Une startup ivoirienne qui transforme l'information en opportunités.",
  "« L'information est la première inégalité. »",
  "Trois piliers au cœur de Synapse",
  "Un espace dédié à l'IA et à l'entrepreneuriat.",
  "Retrouvez Synapse sur nos réseaux",
] as const

const PILLARS = [
  {
    description:
      "Bourses, formations, programmes, métiers et ressources utiles pour construire son parcours.",
    number: "01",
    title: "Orientation & Opportunités",
  },
  {
    description:
      "Formations, prompts, outils et cas pratiques pour rendre l'IA compréhensible et réellement utile.",
    number: "02",
    title: "Intelligence artificielle",
  },
  {
    description:
      "Des ressources et expériences pour aider les porteurs d'idées à passer à l'action.",
    number: "03",
    title: "Entrepreneuriat",
  },
] as const

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

async function loadAboutPage(): Promise<PageModule> {
  const module: unknown = await import("@/app/(public)/a-propos/page")
  if (!isPageModule(module)) {
    throw new Error("la page À propos doit exporter un composant")
  }
  return module
}

describe("page À propos selon la maquette validée", () => {
  afterEach(cleanup)

  it(
    scenario(
      "Les cinq blocs reprennent exactement le récit Synapse dans l'ordre",
      "la maquette validée sans son header ni son footer de démonstration",
      "le Server Component À propos est rendu dans le shell partagé",
      "hero, conviction, piliers, plateforme et réseaux forment cinq régions successives avec leurs textes exacts",
    ),
    async () => {
      const page = await loadAboutPage()
      render(await page.default())

      const main = screen.getByRole("main")
      const regions = within(main).getAllByRole("region")
      expect(regions).toHaveLength(5)
      for (const [index, heading] of BLOCK_HEADINGS.entries()) {
        expect(
          within(regions[index] ?? main).getByRole("heading", {
            name: heading,
          }),
        ).toBeVisible()
      }

      expect(
        within(regions[0] ?? main).getByText("À propos de Synapse"),
      ).toBeVisible()
      expect(
        within(regions[0] ?? main).getByText(
          "Synapse accompagne les jeunes dans leur orientation, leur compréhension des nouvelles technologies et le développement de leurs projets.",
          { exact: true },
        ),
      ).toBeVisible()
      expect(
        within(regions[1] ?? main).getByText("Notre conviction"),
      ).toBeVisible()
      expect(
        within(regions[1] ?? main).getByText(
          "Nous voulons réduire l'écart entre ceux qui ont accès aux bonnes informations, aux bons outils et aux bonnes opportunités, et ceux qui n'y ont pas encore accès.",
          { exact: true },
        ),
      ).toBeVisible()

      const pillarsRegion = regions[2] ?? main
      expect(within(pillarsRegion).getByText("Nos domaines")).toBeVisible()
      const articles = within(pillarsRegion).getAllByRole("article")
      expect(articles).toHaveLength(3)
      for (const [index, pillar] of PILLARS.entries()) {
        const article = articles[index] ?? pillarsRegion
        expect(
          within(article).getByText(pillar.number, { exact: true }),
        ).toBeVisible()
        expect(
          within(article).getByRole("heading", {
            level: 3,
            name: pillar.title,
          }),
        ).toBeVisible()
        expect(
          within(article).getByText(pillar.description, { exact: true }),
        ).toBeVisible()
      }

      const platformRegion = regions[3] ?? main
      expect(within(platformRegion).getByText("Cette plateforme")).toBeVisible()
      expect(
        within(platformRegion).getByText(
          "Cette plateforme rassemble principalement les contenus, prompts, formations, jeux et ressources de Synapse liés à l'intelligence artificielle et à l'entrepreneuriat.",
          { exact: true },
        ),
      ).toBeVisible()
      expect(
        within(platformRegion).getByText(
          "Les actions liées à l'orientation et aux opportunités sont également développées à travers nos autres canaux, programmes et communautés.",
          { exact: true },
        ),
      ).toBeVisible()

      const socialRegion = regions[4] ?? main
      expect(within(socialRegion).getByText("Nous suivre")).toBeVisible()
      expect(
        within(socialRegion).getByText(
          "Suivez nos contenus, opportunités, événements et actualités sur nos différentes plateformes.",
          { exact: true },
        ),
      ).toBeVisible()
    },
  )

  it(
    scenario(
      "Les piliers et réseaux ont une sémantique utile sans faux contact",
      "trois domaines et trois noms de réseaux sans URL officielle fournie",
      "la structure accessible et le HTML du composant sont inspectés",
      "les domaines restent des articles, les réseaux des informations non cliquables, aucun shell dupliqué, style inline, numéro, Atalakou, URL WhatsApp ou href factice n'est rendu",
    ),
    async () => {
      const page = await loadAboutPage()
      const rendered = render(await page.default())
      const main = screen.getByRole("main")
      const socialRegion = within(main).getByRole("region", {
        name: BLOCK_HEADINGS[4],
      })
      const socialList = within(socialRegion).getByRole("list")
      const socialCards = within(socialList).getAllByRole("listitem")

      expect(socialCards).toHaveLength(3)
      for (const [index, label] of [
        "Facebook",
        "TikTok",
        "Chaîne WhatsApp",
      ].entries()) {
        const card = socialCards[index] ?? socialList
        expect(within(card).getByText(label, { exact: true })).toBeVisible()
        expect(within(card).queryByRole("link")).toBeNull()
        expect(within(card).queryByRole("button")).toBeNull()
      }

      expect(rendered.container.querySelectorAll("main")).toHaveLength(1)
      expect(rendered.container.querySelector("header, nav, footer")).toBeNull()
      expect(rendered.container.querySelector("[style]")).toBeNull()
      expect(rendered.container.innerHTML).not.toMatch(
        /2250703381175|Atalakou|wa\.me|href=["']#["']/iu,
      )
    },
  )
})
