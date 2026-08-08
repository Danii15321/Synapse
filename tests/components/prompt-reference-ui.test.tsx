import type { ReactNode } from "react"

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

type PromptCardModule = Readonly<{
  PromptCard: (props: Readonly<Record<string, unknown>>) => ReactNode
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
    throw new Error("la page de détail prompt doit exporter default")
  }
  return module
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.doUnmock("@/server/auth/config")
  vi.doUnmock("@/server/services/prompt-service")
  vi.resetModules()
})

describe("carte et détail de référence Prompts", () => {
  it(
    scenario(
      "Claude reçoit automatiquement le corps d'un prompt public",
      "un PromptActions autorisé à préremplir Claude et un corps public avec accents et caractères réservés",
      "l'utilisateur choisit Claude dans le menu fournisseurs",
      "le corps exact est copié en secours et transmis encodé au lien profond officiel Claude, sans être envoyé automatiquement",
    ),
    async () => {
      const body = "Crée une synthèse : IA & jeunesse ? #1"
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      })
      const open = vi.spyOn(window, "open").mockReturnValue(null)
      const { PromptActions } = await import(
        "@/components/features/prompt-actions"
      )

      render(<PromptActions allowClaudePrefill body={body} />)
      fireEvent.click(screen.getByRole("button", { name: /ouvrir dans/i }))
      fireEvent.click(screen.getByRole("menuitem", { name: /claude/i }))

      expect(open).toHaveBeenCalledWith(
        `claude://claude.ai/new?q=${encodeURIComponent(body)}`,
        "_blank",
        "noopener,noreferrer",
      )
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(body))
      expect(screen.getByRole("status")).toHaveTextContent(/prérempli|secours/i)
    },
  )

  it(
    scenario(
      "Aucun corps premium ni ChatGPT ne sont injectés dans une URL",
      "un PromptActions non autorisé à préremplir Claude avec un corps premium",
      "l'utilisateur ouvre successivement Claude et ChatGPT",
      "les deux fournisseurs utilisent leurs URLs fixes et le corps est uniquement placé dans le presse-papiers",
    ),
    async () => {
      const body = "CORPS_PREMIUM_CONFIDENTIEL"
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      })
      const open = vi.spyOn(window, "open").mockReturnValue(null)
      const { PromptActions } = await import(
        "@/components/features/prompt-actions"
      )

      render(<PromptActions allowClaudePrefill={false} body={body} />)
      for (const provider of ["Claude", "ChatGPT"]) {
        fireEvent.click(screen.getByRole("button", { name: /ouvrir dans/i }))
        fireEvent.click(screen.getByRole("menuitem", { name: provider }))
      }

      expect(open).toHaveBeenNthCalledWith(
        1,
        "https://claude.ai/new",
        "_blank",
        "noopener,noreferrer",
      )
      expect(open).toHaveBeenNthCalledWith(
        2,
        "https://chatgpt.com/",
        "_blank",
        "noopener,noreferrer",
      )
      expect(JSON.stringify(open.mock.calls)).not.toContain(body)
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2))
    },
  )

  it(
    scenario(
      "Un prompt public trop long n'est jamais tronqué silencieusement par Claude",
      "un corps public de 14 001 caractères, au-delà de la limite documentée du lien profond Claude",
      "l'utilisateur choisit Claude",
      "Claude s'ouvre sur son URL fixe et le corps intégral reste disponible dans le presse-papiers",
    ),
    async () => {
      const body = "a".repeat(14_001)
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText },
      })
      const open = vi.spyOn(window, "open").mockReturnValue(null)
      const { PromptActions } = await import(
        "@/components/features/prompt-actions"
      )

      render(<PromptActions allowClaudePrefill body={body} />)
      fireEvent.click(screen.getByRole("button", { name: /ouvrir dans/i }))
      fireEvent.click(screen.getByRole("menuitem", { name: /claude/i }))

      expect(open).toHaveBeenCalledWith(
        "https://claude.ai/new",
        "_blank",
        "noopener,noreferrer",
      )
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(body))
      expect(screen.getByRole("status")).toHaveTextContent(/coller/i)
    },
  )

  it(
    scenario(
      "La carte de référence affiche une image 4/3 de repli et toutes les métadonnées publiques utiles",
      "un DTO PREMIUM sans coverImage et sans body",
      "PromptCard est rendue dans la liste",
      "une image de repli dimensionnée en 4/3, le titre, summary, domaine, tags, badge premium et un lien vers le détail sont présents, sans auteur ni corps inventé",
    ),
    async () => {
      const card = await loadCard()
      const props = {
        coverImage: null,
        domain: "ia",
        id: "prompt-reference",
        slug: "prompt-reference",
        summary: "Une courte description utile.",
        tags: ["strategie", "productivite"],
        title: "Prompt de référence",
        visibility: "PREMIUM",
      } as const

      render(card.PromptCard(props))

      expect(
        screen.getByRole("heading", { name: props.title }),
      ).toBeInTheDocument()
      expect(screen.getByText(props.summary)).toBeInTheDocument()
      expect(screen.getByText(/premium/i)).toBeInTheDocument()
      expect(screen.queryByText(/auteur/i)).not.toBeInTheDocument()
      expect(
        screen.getByRole("link", { name: /prompt de référence/i }),
      ).toHaveAttribute("href", "/prompts/prompt-reference")
      const image = screen.getByRole("img")
      const width = Number(image.getAttribute("width"))
      const height = Number(image.getAttribute("height"))
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(width / height).toBeCloseTo(4 / 3, 2)
    },
  )

  it(
    scenario(
      "Le Markdown éditorial non fiable ne crée jamais de HTML exécutable",
      "un PromptFull autorisé dont le body contient script, image onerror et Markdown ordinaire",
      "le Server Component de détail rend le bloc distinct du corps",
      "aucun élément script ou handler onerror n'existe dans le DOM et le contenu reste lisible comme texte sûr",
    ),
    async () => {
      const body =
        "# Consigne sûre\n<script>window.__attaque = true</script>\n<img src=x onerror=alert(1)>\n**Texte utile**"
      vi.doMock("@/server/auth/config", () => ({
        auth: vi.fn().mockResolvedValue(null),
      }))
      vi.doMock("@/server/services/prompt-service", () => ({
        getPromptBySlug: vi.fn().mockResolvedValue({
          body,
          coverImage: null,
          domain: "ia",
          excerpt: null,
          id: "prompt-xss",
          slug: "prompt-xss",
          summary: "Résumé sûr",
          tags: ["securite"],
          title: "Prompt sûr",
          visibility: "FREE",
        }),
      }))
      const page = await loadDetailPage()

      const rendered = render(
        await page.default({ params: Promise.resolve({ slug: "prompt-xss" }) }),
      )

      expect(rendered.container.querySelector("script")).toBeNull()
      expect(rendered.container.querySelector("[onerror]")).toBeNull()
      expect(
        screen.getByRole("heading", { name: "Consigne sûre" }),
      ).toBeInTheDocument()
      expect(rendered.container.textContent).toContain("Consigne sûre")
      expect(rendered.container.textContent).toContain("Texte utile")
    },
  )
})
