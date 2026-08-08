import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const PROMPTS_DIRECTORY = path.join(ROOT, "ressources", "prompts")
const ALLOWED_DOMAINS = [
  "ia",
  "entrepreneuriat",
  "productivite",
  "communication",
] as const

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function parseFrontmatter(markdown: string): {
  body: string
  fields: Map<string, string>
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/u.exec(markdown)
  expect(
    match,
    "un frontmatter délimité suivi d'un corps est requis",
  ).not.toBeNull()
  if (!match) {
    throw new Error("un frontmatter délimité suivi d'un corps est requis")
  }
  const fields = new Map<string, string>()
  for (const line of (match[1] ?? "").split(/\r?\n/u)) {
    const separator = line.indexOf(":")
    if (separator > 0) {
      fields.set(
        line.slice(0, separator).trim(),
        line.slice(separator + 1).trim(),
      )
    }
  }
  return { body: match[2]?.trim() ?? "", fields }
}

function tagsFrom(value: string | undefined): string[] {
  if (!value || !/^\[[\s\S]*\]$/u.test(value)) {
    return []
  }
  return value
    .slice(1, -1)
    .split(",")
    .map((tag) => tag.trim())
}

describe("contrat éditorial de la rubrique Prompts", () => {
  it(
    scenario(
      "Le README permet à une personne non développeuse d'écrire un prompt conforme",
      "le répertoire contractuel ressources/prompts",
      "son README est lu comme documentation autonome",
      "il documente le frontmatter, le corps Markdown, tous les champs, les quatre domaines, la normalisation des tags, les brouillons et la distinction FREE/PREMIUM sans auteur",
    ),
    async () => {
      const readme = await readFile(
        path.join(PROMPTS_DIRECTORY, "README.md"),
        "utf8",
      )

      expect(readme).toMatch(/frontmatter/i)
      expect(readme).toMatch(/markdown/i)
      for (const field of [
        "slug",
        "title",
        "summary",
        "excerpt",
        "domain",
        "tags",
        "coverImage",
        "visibility",
        "publishedAt",
      ]) {
        expect(readme).toMatch(new RegExp(`\\b${field}\\b`, "i"))
      }
      for (const domain of ALLOWED_DOMAINS) {
        expect(readme).toContain(domain)
      }
      expect(readme).toMatch(/minuscul/i)
      expect(readme).toMatch(/accent/i)
      expect(readme).toMatch(/doublon/i)
      expect(readme).toMatch(/vide|brouillon/i)
      expect(readme).toMatch(/FREE/)
      expect(readme).toMatch(/PREMIUM/)
      expect(readme).not.toMatch(/^\s*(?:author|auteur)\s*:/imu)
    },
  )

  it(
    scenario(
      "Deux exemples réels et utilisables prouvent le contrat FREE et PREMIUM",
      "les fichiers Markdown d'exemple sous ressources/prompts, hors README",
      "leur frontmatter et leur corps sont validés sans figer leur contenu éditorial exact",
      "au moins un FREE et un PREMIUM possèdent les champs requis, un domaine fermé, des tags normalisés uniques, une date ISO, aucun auteur et un corps non vide",
    ),
    async () => {
      const entries = await readdir(PROMPTS_DIRECTORY, { withFileTypes: true })
      const examples = entries.filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          entry.name.toLowerCase() !== "readme.md",
      )
      expect(examples.length).toBeGreaterThanOrEqual(2)

      const visibilities = new Set<string>()
      for (const example of examples) {
        const markdown = await readFile(
          path.join(PROMPTS_DIRECTORY, example.name),
          "utf8",
        )
        const { body, fields } = parseFrontmatter(markdown)
        for (const required of [
          "slug",
          "title",
          "summary",
          "domain",
          "tags",
          "visibility",
          "publishedAt",
        ]) {
          expect(
            fields.get(required),
            `${example.name}: ${required}`,
          ).toBeTruthy()
        }
        expect(fields.has("author")).toBe(false)
        expect(fields.has("auteur")).toBe(false)
        expect(ALLOWED_DOMAINS).toContain(fields.get("domain"))
        expect(fields.get("publishedAt")).toMatch(/^\d{4}-\d{2}-\d{2}$/u)
        expect(body.length).toBeGreaterThan(40)

        const tags = tagsFrom(fields.get("tags"))
        expect(tags.length).toBeGreaterThan(0)
        expect(tags).toEqual([...new Set(tags)])
        for (const tag of tags) {
          expect(tag).toBe(tag.trim())
          expect(tag).toBe(tag.toLowerCase())
          expect(tag.normalize("NFD")).not.toMatch(/[\u0300-\u036f]/u)
        }
        const visibility = fields.get("visibility")
        expect(["FREE", "PREMIUM"]).toContain(visibility)
        if (visibility) {
          visibilities.add(visibility)
        }
      }
      expect(visibilities).toEqual(new Set(["FREE", "PREMIUM"]))
    },
  )

  it(
    scenario(
      "La frontière d'import normalise les tags et refuse domaines, auteurs et champs inconnus",
      "un frontmatter avec espaces, accents, casse, doublons et valeurs vides",
      "le schéma Zod strict de ressource le parse puis reçoit des variantes invalides",
      "les tags deviennent etude et ia une seule fois, tandis qu'un domaine libre, author et tout champ inconnu sont rejetés",
    ),
    async () => {
      const module: unknown = await import("@/lib/validators/prompt")
      if (typeof module !== "object" || module === null) {
        throw new Error(
          "lib/validators/prompt doit exporter un schéma de ressource",
        )
      }
      const schemaEntry = Object.entries(module).find(
        ([name, value]) =>
          /resource|import/i.test(name) &&
          typeof value === "object" &&
          value !== null &&
          "safeParse" in value &&
          typeof value.safeParse === "function",
      )
      const schema = schemaEntry?.[1]
      if (
        typeof schema !== "object" ||
        schema === null ||
        !("safeParse" in schema) ||
        typeof schema.safeParse !== "function"
      ) {
        throw new Error(
          "lib/validators/prompt doit exporter un schéma Zod de ressource ou d'import",
        )
      }
      const valid = {
        body: "Un corps de prompt réellement utilisable.",
        coverImage: null,
        domain: "ia",
        excerpt: null,
        publishedAt: "2026-08-01",
        slug: "test-normalisation",
        summary: "Résumé public",
        tags: ["  ÉTUDE  ", "etude", "", " IA ", "ia"],
        title: "Tester la normalisation",
        visibility: "FREE",
      }

      const parsed = schema.safeParse(valid)
      expect(parsed.success).toBe(true)
      if (!parsed.success) {
        throw new Error("la ressource conforme doit être acceptée")
      }
      expect(parsed.data.tags).toEqual(["etude", "ia"])
      expect(
        schema.safeParse({
          ...valid,
          domain: "marketing",
        }).success,
      ).toBe(false)
      expect(
        schema.safeParse({
          ...valid,
          author: "Auteur inventé",
        }).success,
      ).toBe(false)
      expect(schema.safeParse({ ...valid, extra: true }).success).toBe(false)
    },
  )
})
