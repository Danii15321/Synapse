import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

function scenario(name: string, given: string, when: string, then: string): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function filesUnder(directory: string): string[] {
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

describe("qualité, interface et intégration continue", () => {
  it(
    scenario(
      "ESLint matérialise les interdictions de AGENTS.md",
      "la configuration ESLint du projet",
      "les règles actives sont inspectées",
      "any, console.log et les imports relatifs profonds provoquent une erreur",
    ),
    () => {
      const candidates = ["eslint.config.js", "eslint.config.mjs", ".eslintrc.json", ".eslintrc.js"]
      const configPath = candidates.find((candidate) => {
        try {
          return statSync(join(ROOT, candidate)).isFile()
        } catch {
          return false
        }
      })
      expect(configPath).toBeDefined()
      const config = read(configPath ?? "eslint.config.mjs")

      expect(config).toMatch(/@typescript-eslint\/no-explicit-any/)
      expect(config).toMatch(/no-console/)
      expect(config).toMatch(/no-restricted-imports/)
      expect(config).toMatch(/error/)
    },
  )

  it(
    scenario(
      "Le code du socle respecte la batterie qualité commune",
      "tous les fichiers applicatifs créés par la tranche",
      "les interdictions et tailles maximales sont recherchées",
      "aucun any, ts-ignore non commenté, console.log, style inline ou fichier de plus de 300 lignes n'est présent",
    ),
    () => {
      const files = filesUnder("src").filter((file) => /\.[cm]?[jt]sx?$/.test(file))
      const violations = files.flatMap((file) => {
        const source = read(file)
        const lines = source.split(/\r?\n/)
        const found: string[] = []
        if (/\bany\b/.test(source)) found.push(`${file}: any`)
        if (/console\.log\s*\(/.test(source)) found.push(`${file}: console.log`)
        if (/style\s*=\s*{{/.test(source)) found.push(`${file}: style inline`)
        if (/^\s*\/\/\s*@ts-ignore\s*$/m.test(source)) found.push(`${file}: ts-ignore non commenté`)
        if (lines.length > 300) found.push(`${file}: ${lines.length} lignes`)
        return found
      })

      expect(violations).toEqual([])
    },
  )

  it(
    scenario(
      "Tailwind fournit le vocabulaire visuel mobile-first",
      "la configuration Tailwind et les styles globaux",
      "les breakpoints et familles de tokens sont inspectés",
      "390px est la base sans breakpoint et les seuils sm/md/lg ainsi que palette, typographie, espacements, rayons et ombres sont disponibles",
    ),
    () => {
      const candidates = ["tailwind.config.ts", "tailwind.config.js", "src/app/globals.css"]
      const configuration = candidates
        .map((candidate) => {
          try {
            return read(candidate)
          } catch {
            return ""
          }
        })
        .join("\n")

      for (const token of ["background", "surface", "foreground", "accent", "success", "error", "warning"]) {
        expect(configuration, `token ${token}`).toMatch(new RegExp(`(?:--(?:color-)?|["']?)${token}`))
      }
      for (const family of ["font", "spacing", "radius", "shadow"]) {
        expect(configuration, `famille ${family}`).toMatch(new RegExp(family))
      }
      expect(configuration).toMatch(/sm["']?\s*:\s*["']640px/)
      expect(configuration).toMatch(/md["']?\s*:\s*["']768px/)
      expect(configuration).toMatch(/lg["']?\s*:\s*["'](?:1024px|64rem)/)
    },
  )

  it(
    scenario(
      "La chaîne shadcn est validée par des composants atomiques",
      "le socle UI sans composant métier",
      "les composants de base et leur configuration sont recherchés",
      "Button, Card et Input existent sous components/ui et components.json référence l'alias @/*",
    ),
    () => {
      expect(statSync(join(ROOT, "components.json")).isFile()).toBe(true)
      expect(statSync(join(ROOT, "src/components/ui/button.tsx")).isFile()).toBe(true)
      expect(statSync(join(ROOT, "src/components/ui/card.tsx")).isFile()).toBe(true)
      expect(statSync(join(ROOT, "src/components/ui/input.tsx")).isFile()).toBe(true)
      expect(read("components.json")).toMatch(/@\/components/)
    },
  )

  it(
    scenario(
      "La CI exécute la qualité dans l'ordre sur push et pull request",
      "le workflow GitHub Actions",
      "ses déclencheurs et étapes sont inspectés",
      "lint précède type-check, puis test et build, sur push et pull_request",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      const lint = workflow.indexOf("npm run lint")
      const typeCheck = workflow.indexOf("npm run type-check")
      const test = workflow.indexOf("npm run test")
      const build = workflow.indexOf("npm run build")

      expect(workflow).toMatch(/(?:^|\n)\s*push\s*:/)
      expect(workflow).toMatch(/(?:^|\n)\s*pull_request\s*:/)
      expect(lint).toBeGreaterThan(-1)
      expect(typeCheck).toBeGreaterThan(lint)
      expect(test).toBeGreaterThan(typeCheck)
      expect(build).toBeGreaterThan(test)
    },
  )

  it(
    scenario(
      "La CI prépare la vraie base des futurs tests repository",
      "le workflow GitHub Actions",
      "les services et variables de connexion sont inspectés",
      "un service PostgreSQL 16 avec healthcheck alimente DATABASE_URL sans Redis",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")

      expect(workflow).toMatch(/services\s*:/)
      expect(workflow).toMatch(/postgres\s*:/)
      expect(workflow).toMatch(/image\s*:\s*postgres:16/)
      expect(workflow).toMatch(/pg_isready/)
      expect(workflow).toMatch(/DATABASE_URL/)
      expect(workflow).not.toMatch(/redis/i)
    },
  )

  it(
    scenario(
      "L'audit de dépendances devient bloquant en tranche 03",
      "le workflow GitHub Actions après la mise en place du socle de sécurité",
      "l'étape npm audit est inspectée",
      "npm audit est exécuté et aucun continue-on-error ne neutralise son statut d'échec",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      const auditPosition = workflow.search(/run:\s*npm audit(?:\s|$)/i)
      const auditBlock = workflow.slice(
        Math.max(0, auditPosition - 160),
        auditPosition + 240,
      )

      expect(auditPosition).toBeGreaterThan(-1)
      expect(auditBlock).not.toMatch(/continue-on-error:\s*true/i)
    },
  )

  it(
    scenario(
      "La CI bloque toute modification de la pipeline contractuelle",
      "une pull request qui touche docs/pipeline-dev/",
      "le garde-fou du workflow analyse le diff avec origin/main",
      "l'étape est bloquante et quitte avec un statut non nul dès qu'un fichier de pipeline est trouvé",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")

      expect(workflow).toMatch(/git diff --name-only origin\/main\.\.\./)
      expect(workflow).toMatch(/grep -q ['"]\^docs\/pipeline-dev\//)
      expect(workflow).toMatch(/&&\s*exit 1/)
      const guardSection = workflow.slice(Math.max(0, workflow.indexOf("docs/pipeline-dev") - 250), workflow.indexOf("docs/pipeline-dev") + 250)
      expect(guardSection).not.toMatch(/continue-on-error:\s*true/)
    },
  )

  it(
    scenario(
      "Le démarrage depuis zéro est documenté sans étape cachée",
      "un nouveau contributeur sur un clone frais",
      "le README et l'exemple d'environnement sont consultés",
      "npm install, Docker PostgreSQL, Prisma migrate, seed et npm run dev sont documentés dans cet ordre",
    ),
    () => {
      const readme = read("README.md")
      const commands = [
        "npm install",
        "docker compose up -d postgres",
        "npx prisma migrate dev",
        "npx prisma db seed",
        "npm run dev",
      ]
      let previous = -1
      for (const command of commands) {
        const position = readme.indexOf(command)
        expect(position, command).toBeGreaterThan(previous)
        previous = position
      }
    },
  )
})
