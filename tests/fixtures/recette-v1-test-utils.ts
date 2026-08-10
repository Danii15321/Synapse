import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { expect } from "vitest"

const ROOT = process.cwd()

export function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function markdownFiles(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["journal", "pipeline-dev"].includes(entry.name)) return []
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return markdownFiles(absolutePath)
    return entry.isFile() && entry.name.endsWith(".md") ? [absolutePath] : []
  })
}

export function releaseEvidence(): string {
  const files = [
    join(ROOT, "README.md"),
    join(ROOT, "AGENTS.md"),
    ...markdownFiles(join(ROOT, "docs")),
  ]
  return files
    .filter(existsSync)
    .map((file) => readFileSync(file, "utf8"))
    .join("\n\n")
}

export function expectReleaseEvidence(
  evidence: string,
  expectations: readonly RegExp[],
): void {
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
