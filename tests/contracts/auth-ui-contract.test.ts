import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"

import { describe, expect, it } from "vitest"

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function sourceFilesUnder(directory: string): string[] {
  const absolute = join(process.cwd(), directory)
  if (!existsSync(absolute)) {
    return []
  }
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFilesUnder(child)
    }
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : []
  })
}

function authUiSource(): string {
  const files = [
    ...sourceFilesUnder("src/app/(auth)"),
    ...sourceFilesUnder("src/app/(member)/compte"),
    ...sourceFilesUnder("src/components/features/auth"),
  ]
  expect(files.length).toBeGreaterThan(0)
  return files.map(source).join("\n")
}

describe("contrat UI de la tranche Authentification", () => {
  it(
    scenario(
      "Les formulaires utilisent React Hook Form et les schémas Zod partagés",
      "les écrans login, register et changement de mot de passe",
      "leurs imports et branchements de validation sont inspectés",
      "React Hook Form est relié à zodResolver et aucune validation de sécurité ne repose seulement sur le navigateur",
    ),
    () => {
      const ui = authUiSource()
      expect(ui).toMatch(/react-hook-form/)
      expect(ui).toMatch(/zodResolver/)
      expect(ui).toMatch(/@\/lib\/validators\/auth/)
    },
  )

  it(
    scenario(
      "Les mutations affichent loading et error et empêchent la double soumission",
      "les trois formulaires dans leurs états vide, en cours, en erreur et réussi",
      "leur gestion des mutations et des boutons est inspectée",
      "un état pending/loading désactive chaque bouton, un message d'erreur accessible est rendu et le succès déclenche la navigation attendue",
    ),
    () => {
      const ui = authUiSource()
      expect(ui).toMatch(/isPending|pending|loading/)
      expect(ui).toMatch(/disabled\s*=|disabled:/)
      expect(ui).toMatch(/role\s*=\s*["']alert["']|aria-live/)
      expect(ui).toMatch(/router\.(?:push|replace)|redirect\s*\(/)
    },
  )

  it(
    scenario(
      "Le client n'effectue aucun fetch inline et ne décide jamais de l'identité serveur",
      "tous les composants et pages client de l'authentification",
      "les accès réseau et imports serveur sont inspectés",
      "aucun fetch inline ni import src/server n'existe, et les appels applicatifs passent par lib/api.ts ou la frontière Auth.js autorisée",
    ),
    () => {
      const ui = authUiSource()
      expect(ui).not.toMatch(/\bfetch\s*\(/)
      expect(ui).not.toMatch(/@\/server\//)
      expect(source("src/lib/api.ts")).toMatch(/register|changePassword/)
    },
  )
})
