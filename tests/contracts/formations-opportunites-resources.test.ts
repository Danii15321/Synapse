import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

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
  expect(match, "frontmatter puis corps Markdown requis").not.toBeNull()
  if (!match) throw new Error("frontmatter puis corps Markdown requis")
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

async function examplesOf(resource: string) {
  const directory = path.join(ROOT, "ressources", resource)
  const entries = await readdir(directory, { withFileTypes: true })
  return Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          entry.name.toLowerCase() !== "readme.md",
      )
      .map(async (entry) => ({
        name: entry.name,
        parsed: parseFrontmatter(
          await readFile(path.join(directory, entry.name), "utf8"),
        ),
      })),
  )
}

function schemaFrom(module: unknown, label: string) {
  if (typeof module !== "object" || module === null) {
    throw new Error(`${label} doit exporter un schéma Zod de ressource`)
  }
  const entry = Object.entries(module).find(
    ([name, value]) =>
      /resource|import/i.test(name) &&
      typeof value === "object" &&
      value !== null &&
      "safeParse" in value &&
      typeof value.safeParse === "function",
  )
  if (!entry)
    throw new Error(`${label} doit exporter un schéma Zod de ressource`)
  return entry[1]
}

describe("contrats éditoriaux Formations et Opportunités", () => {
  it(
    scenario(
      "Le README Formations documente le contrat temporel et premium complet",
      "ressources/formations/README.md destiné à une personne non développeuse",
      "la documentation autonome est lue",
      "tous les champs, enums, règles FREE/PREMIUM et cohérence kind/startsAt y figurent, sans inscription pour une permanente",
    ),
    async () => {
      const readme = await readFile(
        path.join(ROOT, "ressources", "formations", "README.md"),
        "utf8",
      )
      for (const field of [
        "slug",
        "title",
        "summary",
        "excerpt",
        "visibility",
        "publishedAt",
        "level",
        "format",
        "durationH",
        "kind",
        "startsAt",
        "coverImage",
      ]) {
        expect(readme).toMatch(new RegExp(`\\b${field}\\b`, "i"))
      }
      for (const value of [
        "PERMANENTE",
        "EVENEMENTIELLE",
        "DEBUTANT",
        "INTERMEDIAIRE",
        "AVANCE",
        "PRESENTIEL",
        "EN_LIGNE",
        "HYBRIDE",
        "FREE",
        "PREMIUM",
      ]) {
        expect(readme).toContain(value)
      }
      expect(readme).toMatch(
        /PERMANENTE[\s\S]*startsAt|startsAt[\s\S]*PERMANENTE/i,
      )
      expect(readme).toMatch(
        /EVENEMENTIELLE[\s\S]*startsAt|startsAt[\s\S]*EVENEMENTIELLE/i,
      )
      expect(readme).toMatch(/permanente[\s\S]*(?:sans|pas d.).*inscription/i)
    },
  )

  it(
    scenario(
      "Deux formations exemples prouvent les deux natures et les deux visibilités",
      "les Markdown de ressources/formations hors README",
      "frontmatter et corps sont validés",
      "au moins une PERMANENTE et une EVENEMENTIELLE, ainsi qu'une FREE et une PREMIUM, sont complètes et startsAt respecte leur nature",
    ),
    async () => {
      const examples = await examplesOf("formations")
      expect(examples.length).toBeGreaterThanOrEqual(2)
      const kinds = new Set<string>()
      const visibilities = new Set<string>()
      for (const { name, parsed } of examples) {
        for (const required of [
          "slug",
          "title",
          "summary",
          "level",
          "format",
          "kind",
          "visibility",
          "publishedAt",
        ]) {
          expect(
            parsed.fields.get(required),
            `${name}: ${required}`,
          ).toBeTruthy()
        }
        expect(parsed.body.length).toBeGreaterThan(40)
        expect(
          parsed.fields.has("startsAt"),
          `${name}: startsAt doit être explicite`,
        ).toBe(true)
        const kind = parsed.fields.get("kind")
        const startsAt = parsed.fields.get("startsAt")
        if (kind === "PERMANENTE") expect(startsAt ?? "").toBe("")
        if (kind === "EVENEMENTIELLE") {
          expect(startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/u)
        }
        if (kind) kinds.add(kind)
        const visibility = parsed.fields.get("visibility")
        if (visibility) visibilities.add(visibility)
      }
      expect(kinds).toEqual(new Set(["PERMANENTE", "EVENEMENTIELLE"]))
      expect(visibilities).toEqual(new Set(["FREE", "PREMIUM"]))
    },
  )

  it(
    scenario(
      "Le schéma Formation refuse les incohérences temporelles et champs inconnus",
      "une ressource permanente sans date et une événementielle avec date ISO",
      "le schéma Zod strict parse les formes valides puis leurs inverses",
      "les formes valides passent, startsAt présent sur PERMANENTE ou absent sur EVENEMENTIELLE échoue, comme tout champ inconnu",
    ),
    async () => {
      const schema = schemaFrom(
        await import("@/lib/validators/formation"),
        "formation validator",
      )
      const common = {
        body: "Programme complet de formation",
        coverImage: null,
        durationH: 4,
        excerpt: "Extrait public",
        format: "EN_LIGNE",
        level: "DEBUTANT",
        publishedAt: "2026-08-08",
        slug: "formation-test",
        summary: "Résumé public",
        title: "Formation test",
        visibility: "FREE",
      }
      const permanent = { ...common, kind: "PERMANENTE", startsAt: null }
      const event = {
        ...common,
        kind: "EVENEMENTIELLE",
        startsAt: "2026-12-12T10:00:00.000Z",
      }
      expect(schema.safeParse(permanent).success).toBe(true)
      expect(schema.safeParse(event).success).toBe(true)
      expect(
        schema.safeParse({ ...permanent, startsAt: event.startsAt }).success,
      ).toBe(false)
      expect(schema.safeParse({ ...event, startsAt: null }).success).toBe(false)
      expect(schema.safeParse({ ...permanent, extra: true }).success).toBe(
        false,
      )
    },
  )

  it(
    scenario(
      "Le contrat Opportunités documente et illustre tous les champs verrouillés",
      "ressources/opportunites/README.md et ses Markdown d'exemple",
      "la documentation et deux ressources sont lues",
      "types, deadline, organisme, FREE/PREMIUM sont documentés, body et externalUrl sont annoncés verrouillés ensemble, et deux exemples réels couvrent FREE et PREMIUM",
    ),
    async () => {
      const readme = await readFile(
        path.join(ROOT, "ressources", "opportunites", "README.md"),
        "utf8",
      )
      for (const field of [
        "slug",
        "title",
        "summary",
        "excerpt",
        "body",
        "visibility",
        "publishedAt",
        "type",
        "organisme",
        "deadline",
        "externalUrl",
        "coverImage",
      ]) {
        expect(readme).toMatch(new RegExp(`\\b${field}\\b`, "i"))
      }
      for (const value of [
        "STAGE",
        "EMPLOI",
        "APPEL_OFFRE",
        "FINANCEMENT",
        "COLLABORATION",
        "FREE",
        "PREMIUM",
      ]) {
        expect(readme).toContain(value)
      }
      expect(readme).toMatch(/body[\s\S]*externalUrl|externalUrl[\s\S]*body/i)
      expect(readme).toMatch(/verrouill|accès|entitle/i)
      const examples = await examplesOf("opportunites")
      expect(examples.length).toBeGreaterThanOrEqual(2)
      const visibilities = new Set(
        examples.map(({ parsed }) => parsed.fields.get("visibility")),
      )
      expect(visibilities).toEqual(new Set(["FREE", "PREMIUM"]))
      for (const { parsed } of examples) {
        expect(parsed.body.length).toBeGreaterThan(40)
        expect(parsed.fields.get("organisme")).toBeTruthy()
        expect(parsed.fields.get("type")).toMatch(
          /^(?:STAGE|EMPLOI|APPEL_OFFRE|FINANCEMENT|COLLABORATION)$/u,
        )
      }
    },
  )
})
