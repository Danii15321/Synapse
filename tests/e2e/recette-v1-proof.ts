import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { expect } from "@playwright/test"

const ROOT = process.cwd()

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["journal", "pipeline-dev"].includes(entry.name)) return []
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : []
  })
}

export function recipeEvidence(): string {
  return [
    join(ROOT, "README.md"),
    join(ROOT, "AGENTS.md"),
    ...markdownFiles(join(ROOT, "docs")),
  ]
    .filter(existsSync)
    .map((path) => readFileSync(path, "utf8"))
    .join("\n\n")
}

export function expectRecipeEvidence(expectations: readonly RegExp[]): void {
  const evidence = recipeEvidence()
  expect(
    evidence,
    "aucune preuve de recette v1 publiée hors pipeline/journal",
  ).toMatch(/recette v1/iu)
  for (const expected of expectations) {
    expect(evidence, `preuve de recette absente : ${expected}`).toMatch(
      expected,
    )
  }
}
