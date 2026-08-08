import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import type { PromptFull, PromptTeaser } from "@/lib/validators/prompt"

type Assert<T extends true> = T
type TeaserExcludesBody = Assert<
  "body" extends keyof PromptTeaser ? false : true
>
type FullIncludesBody = Assert<"body" extends keyof PromptFull ? true : false>
type FullBodyIsRequired = Assert<
  undefined extends PromptFull["body"] ? false : true
>

const TYPE_ASSERTIONS: Readonly<{
  fullBodyIsRequired: FullBodyIsRequired
  fullIncludesBody: FullIncludesBody
  teaserExcludesBody: TeaserExcludesBody
}> = {
  fullBodyIsRequired: true,
  fullIncludesBody: true,
  teaserExcludesBody: true,
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

describe("contrats d'architecture du premium", () => {
  it(
    scenario(
      "PromptTeaser et PromptFull sont deux contrats stricts distincts",
      "les schémas Zod partagés et leurs types inférés contrôlés à la compilation",
      "les mêmes champs publics sont parsés avec et sans body",
      "PromptTeaser exige domain et coverImage nullable mais interdit body, tandis que PromptFull exige body comme string",
    ),
    async () => {
      const module: unknown = await import("@/lib/validators/prompt")
      if (
        !isRecord(module) ||
        !isRecord(module.promptTeaserSchema) ||
        typeof module.promptTeaserSchema.safeParse !== "function" ||
        !isRecord(module.promptFullSchema) ||
        typeof module.promptFullSchema.safeParse !== "function"
      ) {
        throw new Error(
          "validators/prompt doit exporter promptTeaserSchema et promptFullSchema",
        )
      }
      const fields = {
        coverImage: null,
        domain: "ia",
        excerpt: "Extrait public distinct",
        id: "prompt-1",
        slug: "prompt-1",
        summary: "Résumé public",
        tags: ["ia"],
        title: "Prompt",
        visibility: "PREMIUM",
      }

      expect(TYPE_ASSERTIONS).toEqual({
        fullBodyIsRequired: true,
        fullIncludesBody: true,
        teaserExcludesBody: true,
      })
      expect(
        module.promptTeaserSchema.safeParse({
          ...fields,
          body: "corps interdit",
        }).success,
      ).toBe(false)
      expect(
        module.promptTeaserSchema.safeParse({
          excerpt: fields.excerpt,
          id: fields.id,
          slug: fields.slug,
          summary: fields.summary,
          tags: fields.tags,
          title: fields.title,
          visibility: fields.visibility,
        }).success,
      ).toBe(false)
      expect(
        module.promptTeaserSchema.safeParse({
          domain: fields.domain,
          excerpt: fields.excerpt,
          id: fields.id,
          slug: fields.slug,
          summary: fields.summary,
          tags: fields.tags,
          title: fields.title,
          visibility: fields.visibility,
        }).success,
      ).toBe(false)
      expect(module.promptFullSchema.safeParse(fields).success).toBe(false)
      expect(
        module.promptFullSchema.safeParse({ ...fields, body: "corps permis" })
          .success,
      ).toBe(true)
    },
  )

  it(
    scenario(
      "canAccess reste l'unique expression de la règle et n'est appelée que par un service",
      "tous les fichiers TypeScript de src/server",
      "la définition, les appels et les comparaisons visibility/membership sont inventoriés",
      "entitlement.ts porte l'unique fonction, au moins un service l'appelle et aucun repository, handler, script ou composant ne réécrit la décision",
    ),
    () => {
      const entitlementPath = "src/server/access/entitlement.ts"
      expect(existsSync(join(process.cwd(), entitlementPath))).toBe(true)
      const serverFiles = sourceFilesUnder("src/server")
      const callers = serverFiles.filter(
        (path) =>
          path !== entitlementPath && /\bcanAccess\s*\(/.test(source(path)),
      )

      expect(
        source(entitlementPath).match(/function\s+canAccess\b/g),
      ).toHaveLength(1)
      expect(callers.length).toBeGreaterThan(0)
      for (const path of callers) {
        expect(relative("src/server/services", path)).not.toMatch(/^\.\./)
      }

      const duplicatedRules = sourceFilesUnder("src")
        .filter((path) => path !== entitlementPath)
        .filter((path) =>
          /visibility\s*===?\s*["']FREE["']|membership\s*===?\s*["']PREMIUM["']/.test(
            source(path),
          ),
        )
      expect(duplicatedRules).toEqual([])
    },
  )

  it(
    scenario(
      "Le repository conditionne le select Prisma de body à l'entitlement reçu",
      "le source du repository de prompts",
      "les sélections du détail sont inspectées",
      "findBySlug expose une option includeBody utilisée directement dans select.body et aucun findUnique de détail ne charge toute la ligne",
    ),
    () => {
      const repositoryPath = "src/server/repositories/prompt-repository.ts"
      const repositorySource = source(repositoryPath)

      expect(repositorySource).toMatch(/findBySlug/)
      expect(repositorySource).toMatch(
        /select\s*:\s*\{[\s\S]*body\s*:\s*(?:opts|options)\.includeBody/,
      )
      expect(repositorySource).not.toMatch(
        /findUnique\s*\(\s*\{(?![\s\S]*?select\s*:)/,
      )
      expect(repositorySource).not.toMatch(/\bomit\s*\(/)
    },
  )

  it(
    scenario(
      "L'excerpt est une donnée éditoriale séparée et jamais une troncature du body",
      "le modèle Prisma et tous les fichiers applicatifs TypeScript",
      "la présence du champ distinct et les opérations de découpe sont recherchées",
      "Prompt possède excerpt et aucune expression ne fabrique cet extrait avec slice, substring ou substr appliqué à body",
    ),
    () => {
      const prismaSchema = source("prisma/schema.prisma")
      const applicationSource = sourceFilesUnder("src").map(source).join("\n")

      expect(prismaSchema).toMatch(
        /model\s+Prompt\s*\{[\s\S]*\bexcerpt\s+String\b/,
      )
      expect(applicationSource).not.toMatch(
        /\bbody\s*\.\s*(?:slice|substring|substr)\s*\(|(?:slice|substring|substr)\s*\(\s*body\b/,
      )
    },
  )

  it(
    scenario(
      "PremiumGate constate l'absence du corps sans prendre de décision d'accès",
      "le composant visuel PremiumGate",
      "ses imports et ses props sont inspectés",
      "il n'importe ni access, ni server, ni session et ne reçoit ni ne manipule body ou membership",
    ),
    () => {
      const gatePath = "src/components/features/premium-gate.tsx"
      expect(existsSync(join(process.cwd(), gatePath))).toBe(true)
      const gateSource = source(gatePath)

      expect(gateSource).not.toMatch(/@\/server|server\/access|canAccess/)
      expect(gateSource).not.toMatch(/\bbody\b|\bmembership\b/)
      expect(gateSource).toMatch(/aria-hidden/)
      expect(gateSource).toMatch(/blur/)
    },
  )

  it(
    scenario(
      "Les lectures dépendantes de la session ne peuvent pas être mises en cache entre utilisateurs",
      "la page et le Route Handler du détail prompt",
      "leur politique de rendu et de cache est inspectée",
      "la page est explicitement dynamique et la lecture sessionnée déclare force-dynamic ou no-store",
    ),
    () => {
      const pageSource = source("src/app/(public)/prompts/[slug]/page.tsx")
      const routeSource = source("src/app/api/prompts/[slug]/route.ts")
      const combined = `${pageSource}\n${routeSource}`

      expect(pageSource).toMatch(
        /dynamic\s*=\s*["']force-dynamic["']|(?:unstable_)?noStore\s*\(/,
      )
      expect(combined).toMatch(
        /dynamic\s*=\s*["']force-dynamic["']|cache\s*:\s*["']no-store["']|(?:unstable_)?noStore\s*\(/,
      )
    },
  )

  it(
    scenario(
      "La promotion PREMIUM n'est exposée par aucune route ni Server Action publique",
      "les handlers, actions et scripts npm du projet",
      "les capacités de mutation du membership sont inventoriées",
      "un unique script grant-premium existe hors src/app, package.json l'expose et aucun endpoint ni action n'appelle une primitive de promotion",
    ),
    () => {
      const packageJson: unknown = JSON.parse(source("package.json"))
      if (!isRecord(packageJson) || !isRecord(packageJson.scripts)) {
        throw new Error("package.json doit définir ses scripts")
      }
      const grantScript = packageJson.scripts["grant-premium"]
      expect(typeof grantScript).toBe("string")
      expect(grantScript).toMatch(/grant-premium/)
      expect(existsSync(join(process.cwd(), "scripts/grant-premium.ts"))).toBe(
        true,
      )

      const publicMutators = sourceFilesUnder("src/app")
        .filter((path) => {
          const fileSource = source(path)
          return (
            /(?:route|action)\.tsx?$/.test(path) ||
            /(?:^|\/)actions?(?:\/|\.)/.test(path) ||
            /^[\s\S]*["']use server["']/.test(fileSource)
          )
        })
        .filter((path) =>
          /(?:grant|promot|set|update)[A-Za-z]*(?:Premium|Membership)|(?:Premium|Membership)[A-Za-z]*(?:grant|promot|set|update)|membership\s*:\s*["']PREMIUM["']/i.test(
            source(path),
          ),
        )

      expect(publicMutators).toEqual([])
    },
  )
})
