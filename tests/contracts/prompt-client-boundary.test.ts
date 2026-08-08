import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

describe("frontière cliente minimale de la rubrique Prompts", () => {
  it(
    scenario(
      "Copier et le menu fournisseurs restent une île cliente isolée",
      "la page liste, la page détail et le composant d'actions Prompts",
      "leurs directives client et leurs imports sont inspectés",
      "les deux pages restent Server Components et l'île qui contient Copier, ChatGPT et Claude porte use client sans import serveur",
    ),
    async () => {
      const detail = await readFile(
        path.join(
          process.cwd(),
          "src",
          "app",
          "(public)",
          "prompts",
          "[slug]",
          "page.tsx",
        ),
        "utf8",
      )
      const list = await readFile(
        path.join(
          process.cwd(),
          "src",
          "app",
          "(public)",
          "prompts",
          "page.tsx",
        ),
        "utf8",
      )
      const featuresDirectory = path.join(
        process.cwd(),
        "src",
        "components",
        "features",
      )
      const featureFiles = (await readdir(featuresDirectory)).filter((file) =>
        file.endsWith(".tsx"),
      )
      const actionCandidates: Array<{ file: string; source: string }> = []
      for (const file of featureFiles) {
        const source = await readFile(
          path.join(featuresDirectory, file),
          "utf8",
        )
        if (/chatgpt|claude|copier/i.test(source)) {
          actionCandidates.push({ file, source })
        }
      }

      expect(detail).not.toMatch(/^\s*["']use client["']/mu)
      expect(list).not.toMatch(/^\s*["']use client["']/mu)
      expect(actionCandidates).toHaveLength(1)
      const actions = actionCandidates[0]
      expect(actions?.source).toMatch(/^\s*["']use client["']/u)
      expect(actions?.source).not.toMatch(/@\/server\/|src\/server\//u)
      expect(detail).toContain(actions?.file.replace(/\.tsx$/u, ""))
    },
  )

  it(
    scenario(
      "L'accueil remplace explicitement la carte provisoire par la carte Prompt de référence",
      "la page d'accueil issue de la tranche 06",
      "ses imports et son rendu des contenus récents sont inspectés",
      "PromptCard est utilisée et ProvisionalContentCard n'est plus référencée",
    ),
    async () => {
      const home = await readFile(
        path.join(process.cwd(), "src", "app", "page.tsx"),
        "utf8",
      )

      expect(home).toMatch(/PromptCard/u)
      expect(home).not.toMatch(/ProvisionalContentCard/u)
    },
  )
})
