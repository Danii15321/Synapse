import { readFileSync, readdirSync } from "node:fs"
import { basename, join } from "node:path"
import type { ReactNode } from "react"

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { PromptCardDto } from "@/lib/validators/prompt"

type PromptCardModule = Readonly<{
  PromptCard: (props: PromptCardDto) => ReactNode
}>

type DetailPageModule = Readonly<{
  default: (
    props: Readonly<{ params: Promise<{ slug: string }> }>,
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

function isPromptCardModule(value: unknown): value is PromptCardModule {
  return isRecord(value) && typeof value.PromptCard === "function"
}

function isDetailPageModule(value: unknown): value is DetailPageModule {
  return isRecord(value) && typeof value.default === "function"
}

async function loadCard(): Promise<PromptCardModule> {
  const module: unknown = await import("@/components/features/prompt-card")
  if (!isPromptCardModule(module)) {
    throw new Error("prompt-card doit exporter PromptCard")
  }
  return module
}

async function loadDetailPage(): Promise<DetailPageModule> {
  const module: unknown = await vi.importActual(
    "@/app/(public)/prompts/[slug]/page",
  )
  if (!isDetailPageModule(module)) {
    throw new Error("la page détail Prompt doit exporter default")
  }
  return module
}

const CURRENT_PROMPT = {
  body: "Corps public courant",
  coverImage: null,
  domain: "ia",
  excerpt: null,
  id: "prompt-courant",
  slug: "prompt-courant",
  summary: "Résumé courant",
  tags: ["courant"],
  title: "Prompt courant",
  visibility: "FREE",
} as const

function relatedCard(index: number): PromptCardDto {
  return {
    coverImage: null,
    domain: "ia",
    id: `suggestion-${index}`,
    slug: `suggestion-${index}`,
    summary: `Résumé suggestion ${index}`,
    tags: [`tag-${index}`],
    title: `Suggestion ${index}`,
    visibility: index === 2 ? "PREMIUM" : "FREE",
  }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/prompt-service")
  vi.resetModules()
})

describe("partage des cartes et suggestions du détail Prompt", () => {
  it(
    scenario(
      "Chaque PromptCard partage seulement son titre public et son URL absolue",
      "une carte FREE et une PREMIUM avec résumé, domaine et tags sentinelles",
      "l'utilisateur ouvre le menu, copie le lien puis choisit WhatsApp et Facebook",
      "le lien détail reste indépendant, le menu expose exactement trois options illustrées, se ferme après chaque action et aucune autre donnée éditoriale n'est partagée",
    ),
    async () => {
      const card = await loadCard()
      const free = relatedCard(1)
      const premium = relatedCard(2)
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      })
      const open = vi.spyOn(window, "open").mockReturnValue(null)

      render(
        <>
          {card.PromptCard(free)}
          {card.PromptCard(premium)}
        </>,
      )

      const freeArticle = screen
        .getByRole("heading", { name: free.title })
        .closest("article")
      const premiumArticle = screen
        .getByRole("heading", { name: premium.title })
        .closest("article")
      if (!freeArticle || !premiumArticle) {
        throw new Error("chaque PromptCard doit être contenue dans un article")
      }
      const freeUi = within(freeArticle)
      const premiumUi = within(premiumArticle)
      const detailLink = freeUi.getByRole("link", { name: free.title })
      const share = freeUi.getByRole("button", { name: /^partager$/i })
      expect(detailLink).toHaveAttribute("href", `/prompts/${free.slug}`)
      expect(detailLink).not.toContainElement(share)
      expect(share).toHaveAttribute("aria-expanded", "false")
      expect(share.querySelector("svg")).not.toBeNull()
      expect(
        premiumUi.getByRole("button", { name: /^partager$/i }),
      ).toBeVisible()

      fireEvent.click(share)
      expect(share).toHaveAttribute("aria-expanded", "true")
      const menu = screen.getByRole("menu")
      const options = within(menu).getAllByRole("menuitem")
      expect(options.map((option) => option.textContent?.trim())).toEqual([
        "Copier le lien",
        "WhatsApp",
        "Facebook",
      ])
      const iconMarkup = options.map(
        (option) => option.querySelector("svg")?.innerHTML ?? "",
      )
      expect(iconMarkup.every(Boolean)).toBe(true)
      expect(new Set(iconMarkup).size).toBe(3)

      const absoluteUrl = `${window.location.origin}/prompts/${free.slug}`
      fireEvent.click(
        within(menu).getByRole("menuitem", { name: "Copier le lien" }),
      )
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(absoluteUrl))
      expect(freeUi.getByRole("status")).toHaveTextContent(/copié/i)
      expect(share).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()

      fireEvent.click(share)
      fireEvent.click(screen.getByRole("menuitem", { name: "WhatsApp" }))
      expect(open).toHaveBeenNthCalledWith(
        1,
        `https://wa.me/?text=${encodeURIComponent(`${free.title} ${absoluteUrl}`)}`,
        "_blank",
        "noopener,noreferrer",
      )
      expect(share).toHaveAttribute("aria-expanded", "false")

      fireEvent.click(share)
      fireEvent.click(screen.getByRole("menuitem", { name: "Facebook" }))
      expect(open).toHaveBeenNthCalledWith(
        2,
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`,
        "_blank",
        "noopener,noreferrer",
      )
      expect(share).toHaveAttribute("aria-expanded", "false")

      const sharedPayloads = JSON.stringify([
        writeText.mock.calls,
        open.mock.calls,
      ])
      for (const forbidden of [free.summary, free.domain, ...free.tags]) {
        expect(sharedPayloads).not.toContain(forbidden)
      }
    },
  )

  it(
    scenario(
      "Le détail place au plus trois PromptCard liées tout en bas",
      "un PromptFull courant et trois DTO de carte du même domaine fournis par le service",
      "le Server Component de détail est rendu",
      "la dernière section s'intitule Vous aimerez aussi, contient les trois liens et actions Partager, exclut le courant et appelle le service avec domain et id",
    ),
    async () => {
      const suggestions = [relatedCard(1), relatedCard(2), relatedCard(3)]
      const getRelatedPrompts = vi.fn().mockResolvedValue(suggestions)
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue(CURRENT_PROMPT),
        getRelatedPrompts,
      }))
      const page = await loadDetailPage()

      render(
        await page.default({
          params: Promise.resolve({ slug: CURRENT_PROMPT.slug }),
        }),
      )

      expect(getRelatedPrompts).toHaveBeenCalledWith({
        domain: CURRENT_PROMPT.domain,
        excludeId: CURRENT_PROMPT.id,
      })
      const heading = screen.getByRole("heading", {
        name: /vous aimerez aussi/i,
      })
      const section = heading.closest("section")
      if (!section)
        throw new Error("les suggestions doivent former une section")
      const sections = screen.getByRole("main").querySelectorAll("section")
      expect(sections.item(sections.length - 1)).toBe(section)
      expect(within(section).getAllByRole("article")).toHaveLength(3)
      expect(
        within(section).getAllByRole("button", { name: /partager/i }),
      ).toHaveLength(3)
      expect(
        within(section).queryByText(CURRENT_PROMPT.title),
      ).not.toBeInTheDocument()
      for (const suggestion of suggestions) {
        expect(
          within(section).getByRole("link", { name: suggestion.title }),
        ).toHaveAttribute("href", `/prompts/${suggestion.slug}`)
      }
    },
  )

  it(
    scenario(
      "Le détail adapte ou omet la section selon le nombre de correspondances",
      "deux suggestions disponibles lors d'un premier rendu puis aucune lors d'un second",
      "le Server Component de détail est rendu successivement avec ces réponses",
      "la première section contient exactement deux cartes et la seconde page ne rend aucun intitulé ni conteneur de suggestions vide",
    ),
    async () => {
      const getRelatedPrompts = vi
        .fn()
        .mockResolvedValueOnce([relatedCard(1), relatedCard(2)])
        .mockResolvedValueOnce([])
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue(CURRENT_PROMPT),
        getRelatedPrompts,
      }))
      const page = await loadDetailPage()

      render(
        await page.default({
          params: Promise.resolve({ slug: CURRENT_PROMPT.slug }),
        }),
      )
      const firstHeading = screen.getByRole("heading", {
        name: /vous aimerez aussi/i,
      })
      const firstSection = firstHeading.closest("section")
      if (!firstSection) throw new Error("la section liée doit être rendue")
      expect(within(firstSection).getAllByRole("article")).toHaveLength(2)

      cleanup()
      render(
        await page.default({
          params: Promise.resolve({ slug: CURRENT_PROMPT.slug }),
        }),
      )
      expect(
        screen.queryByRole("heading", { name: /vous aimerez aussi/i }),
      ).not.toBeInTheDocument()
      const emptySections = Array.from(
        screen.getByRole("main").querySelectorAll("section"),
      ).filter((section) => section.children.length === 0)
      expect(emptySections).toHaveLength(0)
    },
  )

  it(
    scenario(
      "Le partage reste une petite île cliente sous une carte et une page serveur",
      "les sources de la page détail, de PromptCard et des composants métier",
      "leurs directives et imports sont inspectés",
      "page et carte n'ont pas use client, tandis qu'un unique composant de partage client portant les trois actions est importé par PromptCard",
    ),
    () => {
      const root = process.cwd()
      const detailSource = readFileSync(
        join(root, "src/app/(public)/prompts/[slug]/page.tsx"),
        "utf8",
      )
      const cardSource = readFileSync(
        join(root, "src/components/features/prompt-card.tsx"),
        "utf8",
      )
      const featuresDirectory = join(root, "src/components/features")
      const sharingFiles = readdirSync(featuresDirectory)
        .filter((file) => /\.tsx$/u.test(file))
        .filter((file) => {
          const source = readFileSync(join(featuresDirectory, file), "utf8")
          return ["Copier le lien", "WhatsApp", "Facebook"].every((label) =>
            source.includes(label),
          )
        })

      expect(detailSource).not.toMatch(/^\s*["']use client["']/u)
      expect(cardSource).not.toMatch(/^\s*["']use client["']/u)
      expect(sharingFiles).toHaveLength(1)
      const sharingFile = sharingFiles[0]
      if (!sharingFile) throw new Error("le composant de partage client manque")
      const sharingSource = readFileSync(
        join(featuresDirectory, sharingFile),
        "utf8",
      )
      expect(sharingSource).toMatch(/^\s*["']use client["']/u)
      expect(cardSource).toContain(basename(sharingFile, ".tsx"))
    },
  )
})
