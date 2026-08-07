import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import HomePage from "@/app/page"

function scenario(name: string, given: string, when: string, then: string): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

describe("page d'accueil", () => {
  it(
    scenario(
      "La chaîne Vitest et Testing Library rend une vraie page d'accueil",
      "le composant serveur d'accueil du projet initialisé",
      "la page est rendue dans le DOM de test",
      "un contenu principal et un titre accessible sont présents, sans dépendre d'un texte produit hors périmètre",
    ),
    () => {
      render(<HomePage />)

      expect(screen.getByRole("main")).toBeInTheDocument()
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument()
    },
  )
})
