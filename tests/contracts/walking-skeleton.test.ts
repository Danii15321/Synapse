import { readFileSync, readdirSync } from "node:fs"
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
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const relativePath = join(directory, entry.name)
      return entry.isDirectory() ? sourceFiles(relativePath) : [relativePath]
    },
  )
}

describe("contrat du walking skeleton Prompts", () => {
  it(
    scenario(
      "Le modèle Prompt conserve les six champs fondateurs du walking skeleton",
      "le schéma Prisma enrichi par les tranches postérieures au walking skeleton",
      "la déclaration du modèle Prompt est inspectée",
      "id, slug unique, title, summary, createdAt et updatedAt restent présents avec leurs types et contraintes d'origine, sans interdire les champs ajoutés par les tranches suivantes",
    ),
    () => {
      const schema = read("prisma/schema.prisma")
      const model = schema.match(/model\s+Prompt\s*{([\s\S]*?)}/)?.[1] ?? ""
      const fields = [...model.matchAll(/^\s*(\w+)\s+/gm)].map(
        (match) => match[1],
      )

      expect(fields).toEqual(
        expect.arrayContaining([
          "id",
          "slug",
          "title",
          "summary",
          "createdAt",
          "updatedAt",
        ]),
      )
      expect(model).toMatch(/^\s*id\s+String\s+@id\s+@default\(cuid\(\)\)/m)
      expect(model).toMatch(/^\s*slug\s+String\s+@unique/m)
      expect(model).toMatch(/^\s*title\s+String\s*$/m)
      expect(model).toMatch(/^\s*summary\s+String\s*$/m)
      expect(model).toMatch(/^\s*createdAt\s+DateTime\s+@default\(now\(\)\)/m)
      expect(model).toMatch(/^\s*updatedAt\s+DateTime\s+@updatedAt/m)
    },
  )

  it(
    scenario(
      "La page Prompts est un Server Component qui appelle directement le service",
      "la route publique figée /prompts",
      "le source de sa page est inspecté",
      "il ne porte pas use client, importe prompt-service et ne fait aucun fetch vers sa propre API",
    ),
    () => {
      const page = read("src/app/(public)/prompts/page.tsx")

      expect(page).not.toMatch(/^\s*["']use client["']/m)
      expect(page).toMatch(/from\s+["']@\/server\/services\/prompt-service["']/)
      expect(page).not.toMatch(/\bfetch\s*\(/)
      expect(page).not.toMatch(/["']\/api\/prompts["']/)
    },
  )

  it(
    scenario(
      "Le client atteint Prompts uniquement par le BFF partagé",
      "tous les fichiers TypeScript applicatifs et la route publique /api/prompts",
      "les appels fetch et le contrat de lib/api.ts sont inspectés",
      "getPrompts appelle /api/prompts et aucun autre fichier sous src ne contient de fetch",
    ),
    () => {
      const api = read("src/lib/api.ts")
      const fetchOwners = sourceFiles("src")
        .filter((file) => /\.[cm]?[jt]sx?$/.test(file))
        .filter((file) => /\bfetch\s*\(/.test(read(file)))

      expect(api).toMatch(/export\s+(?:async\s+)?function\s+getPrompts\s*\(/)
      expect(api).toMatch(/fetch\s*\(\s*["']\/api\/prompts["']/)
      expect(fetchOwners).toEqual([join("src", "lib", "api.ts")])
    },
  )

  it(
    scenario(
      "Chaque couche du fil Prompts respecte sa frontière",
      "le Route Handler, le service et le repository du walking skeleton",
      "leurs imports et primitives sont inspectés",
      "le handler dépend du service sans Prisma, le service est server-only sans HTTP, et le repository server-only utilise select et take",
    ),
    () => {
      const route = read("src/app/api/prompts/route.ts")
      const service = read("src/server/services/prompt-service.ts")
      const repository = read("src/server/repositories/prompt-repository.ts")

      expect(route).toMatch(
        /from\s+["']@\/server\/services\/prompt-service["']/,
      )
      expect(route).not.toMatch(
        /@prisma\/client|@\/server\/db|\bPrismaClient\b/,
      )
      expect(service).toMatch(/^import\s+["']server-only["']/)
      expect(service).toMatch(
        /from\s+["']@\/server\/repositories\/prompt-repository["']/,
      )
      expect(service).not.toMatch(/NextResponse|next\/server|\bfetch\s*\(/)
      expect(repository).toMatch(/^import\s+["']server-only["']/)
      expect(repository).toMatch(/from\s+["']@\/server\/db["']/)
      expect(repository).toMatch(/\bselect\s*:/)
      expect(repository).toMatch(/\btake\s*:/)
      expect(repository).not.toMatch(/NextResponse|next\/server/)
    },
  )

  it(
    scenario(
      "La CI traverse PostgreSQL jusqu'au navigateur",
      "le workflow de la tranche 02 avec son service PostgreSQL 16",
      "les étapes situées avant et après la suite Vitest sont inspectées",
      "la migration et le seed précèdent les tests repository, puis Playwright rejoue le parcours E2E",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      const migrate = workflow.indexOf("npx prisma migrate")
      const seed = workflow.indexOf("npx prisma db seed")
      const unitTests = workflow.indexOf("npm run test")
      const endToEnd = workflow.indexOf("npm run e2e")

      expect(migrate).toBeGreaterThan(-1)
      expect(seed).toBeGreaterThan(migrate)
      expect(unitTests).toBeGreaterThan(seed)
      expect(endToEnd).toBeGreaterThan(unitTests)
    },
  )

  it(
    scenario(
      "Le seed déclare deux upserts et aucune création aveugle",
      "le seed embryonnaire de la rubrique Prompts",
      "ses opérations d'écriture sont inspectées",
      "deux prompts sont écrits par upsert sur leur slug et prompt.create n'est jamais utilisé",
    ),
    () => {
      const seed = read("prisma/seed.ts")

      expect(seed.match(/\bdb\.prompt\.upsert\s*\(/g) ?? []).toHaveLength(2)
      expect(seed).toMatch(/where\s*:\s*{\s*slug\s*:/)
      expect(seed).not.toMatch(/\.prompt\.create(?:Many)?\s*\(/)
    },
  )
})
