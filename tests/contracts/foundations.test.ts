import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function sourceFiles(directory: string): string[] {
  const absoluteDirectory = join(ROOT, directory)

  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap(
    (entry) => {
      const relativePath = join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(relativePath) : [relativePath]
    },
  )
}

describe("fondations du projet", () => {
  it(
    scenario(
      "Le projet Next.js respecte le langage et les conventions imposés",
      "un clone frais du dépôt",
      "la configuration du package et de TypeScript est inspectée",
      "le package s'appelle synapse, Next 15+ utilise App Router sous src avec l'alias @/*, et toutes les options strictes demandées sont actives",
    ),
    () => {
      const packageJson: unknown = JSON.parse(read("package.json"))
      const tsconfig: unknown = JSON.parse(read("tsconfig.json"))

      expect(packageJson).toMatchObject({
        name: "synapse",
        dependencies: {
          next: expect.stringMatching(/(?:\^|~)?(?:1[5-9]|[2-9]\d)\./),
          "server-only": expect.any(String),
        },
      })
      expect(tsconfig).toMatchObject({
        compilerOptions: {
          strict: true,
          noUncheckedIndexedAccess: true,
          noImplicitOverride: true,
          paths: { "@/*": ["./src/*"] },
        },
      })
      expect(statSync(join(ROOT, "src/app")).isDirectory()).toBe(true)
      expect(read("src/app/layout.tsx")).not.toMatch(/^\s*["']use client["']/m)
    },
  )

  it(
    scenario(
      "L'arborescence d'architecture est présente et versionnable",
      "l'arborescence normative de AGENTS.md",
      "chaque dossier attendu est inspecté",
      "tous les dossiers existent et chaque dossier encore vide contient un .gitkeep",
    ),
    () => {
      const expectedDirectories = [
        "prisma/migrations",
        "src/app/(public)/prompts",
        "src/app/(public)/formations",
        "src/app/(public)/jeux",
        "src/app/(public)/opportunites",
        "src/app/(auth)/login",
        "src/app/(auth)/register",
        "src/app/(auth)/forgot-password",
        "src/app/(member)/compte",
        "src/app/(member)/premium",
        "src/app/api/prompts",
        "src/app/api/formations",
        "src/app/api/jeux",
        "src/app/api/opportunites",
        "src/app/api/auth",
        "src/components/ui",
        "src/components/features",
        "src/server/auth",
        "src/server/services",
        "src/server/repositories",
        "src/server/access",
        "src/server/errors",
        "src/lib/validators",
        "src/hooks",
        "src/types",
        "tests/e2e",
        "tests/api",
        "tests/services",
        "tests/repositories",
      ]

      for (const directory of expectedDirectories) {
        const absoluteDirectory = join(ROOT, directory)
        expect(statSync(absoluteDirectory).isDirectory(), directory).toBe(true)
        const entries = readdirSync(absoluteDirectory)
        if (entries.length === 0) {
          expect(entries, `${directory} doit être versionnable`).toContain(
            ".gitkeep",
          )
        }
      }
    },
  )

  it(
    scenario(
      "Les scripts npm couvrent toute la chaîne locale",
      "le package du projet initialisé",
      "les scripts npm sont lus",
      "dev, build, lint, type-check, format, test et e2e sont tous exécutables",
    ),
    () => {
      const packageJson: unknown = JSON.parse(read("package.json"))
      expect(packageJson).toMatchObject({
        scripts: {
          dev: expect.any(String),
          build: expect.any(String),
          lint: expect.any(String),
          "type-check": expect.any(String),
          format: expect.any(String),
          test: expect.any(String),
          e2e: expect.any(String),
        },
      })
    },
  )

  it(
    scenario(
      "Chaque installation régénère le client Prisma",
      "un build Vercel pouvant restaurer node_modules depuis un cache antérieur au schéma courant",
      "le script postinstall du package est inspecté",
      "npm exécute exactement prisma generate après chaque installation afin que le client reflète toujours le schéma versionné",
    ),
    () => {
      const packageJson: unknown = JSON.parse(read("package.json"))

      expect(packageJson).toMatchObject({
        scripts: { postinstall: "prisma generate" },
      })
    },
  )

  it(
    scenario(
      "PostgreSQL 16 est l'unique infrastructure locale",
      "la configuration Docker du dépôt",
      "les services et leurs images sont inspectés",
      "un unique service postgres utilise PostgreSQL 16 et aucun Redis ou service externe n'est déclaré",
    ),
    () => {
      const compose = read("docker-compose.yml")
      const serviceNames = [
        ...compose.matchAll(/^  ([a-zA-Z][\w-]*):\s*$/gm),
      ].map((match) => match[1])

      expect(serviceNames).toEqual(["postgres"])
      expect(compose).toMatch(
        /^\s*image:\s*["']?postgres:16(?:[.-][\w.-]+)?["']?\s*$/m,
      )
      expect(compose).not.toMatch(/redis|mysql|mariadb|mongo/i)
    },
  )

  it(
    scenario(
      "Prisma conserve sa configuration PostgreSQL durable",
      "le socle Prisma à travers les tranches fonctionnelles",
      "le schéma Prisma est inspecté",
      "il contient toujours un generator et un datasource PostgreSQL basé sur DATABASE_URL",
    ),
    () => {
      const schema = read("prisma/schema.prisma")

      expect(schema).toMatch(/generator\s+client\s*{/)
      expect(schema).toMatch(/datasource\s+db\s*{/)
      expect(schema).toMatch(/provider\s*=\s*["']postgresql["']/)
      expect(schema).toMatch(/url\s*=\s*env\(["']DATABASE_URL["']\)/)
    },
  )

  it(
    scenario(
      "Le singleton Prisma résiste aux rechargements de développement",
      "le module serveur de base de données",
      "ses instanciations et son cache sont inspectés",
      "un seul PrismaClient est créé et réutilisé via globalThis en développement",
    ),
    () => {
      const dbSource = read("src/server/db.ts")
      const serverSources = sourceFiles("src/server").map(read).join("\n")

      expect(dbSource).toMatch(/^import\s+["']server-only["']/)
      expect(dbSource).toMatch(/globalThis/)
      expect(dbSource).toMatch(/NODE_ENV/)
      expect(
        serverSources.match(/new\s+PrismaClient\s*\(/g) ?? [],
      ).toHaveLength(1)
    },
  )

  it(
    scenario(
      "Les variables d'environnement ont une frontière serveur unique",
      "tous les fichiers TypeScript de src",
      "les lectures directes de process.env sont recherchées",
      "seul src/server/config.ts lit process.env et tous les fichiers serveur commencent par server-only",
    ),
    () => {
      const files = sourceFiles("src").filter((file) =>
        /\.[cm]?[jt]sx?$/.test(file),
      )
      const illegalEnvReaders = files.filter(
        (file) =>
          file !== "src/server/config.ts" && /process\.env/.test(read(file)),
      )
      const unguardedServerFiles = files.filter(
        (file) =>
          file.startsWith("src/server/") &&
          !/^import\s+["']server-only["']/m.test(read(file)),
      )

      expect(illegalEnvReaders).toEqual([])
      expect(unguardedServerFiles).toEqual([])
    },
  )

  it(
    scenario(
      "Les fichiers d'environnement empêchent les secrets d'entrer dans Git",
      "la configuration versionnée du dépôt",
      "le gitignore et l'exemple d'environnement sont inspectés",
      ".env.example contient une DATABASE_URL factice et .env* est ignoré sauf cet exemple",
    ),
    () => {
      const gitignore = read(".gitignore")
      const example = read(".env.example")

      expect(gitignore).toMatch(/^\.env\*\s*$/m)
      expect(gitignore).toMatch(/^!\.env\.example\s*$/m)
      expect(example).toMatch(/^DATABASE_URL=(?!\s*$).+/m)
      expect(example).not.toMatch(
        /password\s*=\s*(?!synapse|change|example|fake)/i,
      )
    },
  )
})
