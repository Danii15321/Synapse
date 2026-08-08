import { describe, expect, it } from "vitest"

import { scenario } from "../repositories/replicated-content-fixtures"

function schemaFrom(module: unknown) {
  if (typeof module !== "object" || module === null) {
    throw new Error("opportunite validator doit exporter un schéma Zod")
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
    throw new Error("opportunite validator doit exporter un schéma Zod")
  return entry[1]
}

function fullSchemaFrom(module: unknown) {
  if (typeof module !== "object" || module === null) {
    throw new Error("opportunite validator doit exporter un schéma DTO complet")
  }
  const entry = Object.entries(module).find(
    ([name, value]) =>
      /full/i.test(name) &&
      typeof value === "object" &&
      value !== null &&
      "safeParse" in value &&
      typeof value.safeParse === "function",
  )
  if (!entry)
    throw new Error("opportunite validator doit exporter un schéma DTO complet")
  return entry[1]
}

describe("frontière éditoriale Opportunité", () => {
  it(
    scenario(
      "Le schéma Opportunité est strict et valide ses URL et dates",
      "une ressource conforme avec externalUrl HTTPS et deadline ISO",
      "le schéma Zod de ressource reçoit la forme valide puis des variantes hostiles",
      "la ressource valide passe, une URL javascript, une deadline invalide et un champ inconnu sont rejetés",
    ),
    async () => {
      const schema = schemaFrom(await import("@/lib/validators/opportunite"))
      const valid = {
        body: "Description complète de cette opportunité.",
        coverImage: null,
        deadline: "2026-12-31T23:59:59.000Z",
        excerpt: "Extrait public",
        externalUrl: "https://example.test/candidature",
        organisme: "Synapse",
        publishedAt: "2026-08-08",
        slug: "opportunite-test",
        summary: "Résumé public",
        title: "Opportunité test",
        type: "STAGE",
        visibility: "PREMIUM",
      }
      expect(schema.safeParse(valid).success).toBe(true)
      expect(
        schema.safeParse({ ...valid, externalUrl: "javascript:alert(1)" })
          .success,
      ).toBe(false)
      expect(schema.safeParse({ ...valid, deadline: "demain" }).success).toBe(
        false,
      )
      expect(
        schema.safeParse({ ...valid, membership: "PREMIUM" }).success,
      ).toBe(false)
    },
  )

  it(
    scenario(
      "Le DTO complet n'autorise que HTTPS pour le lien de candidature",
      "un OpportuniteFull complet dont externalUrl utilise HTTPS",
      "le schéma DTO complet parse HTTPS puis les variantes http, javascript, data et ftp",
      "HTTPS est accepté et chacun des quatre protocoles non sûrs est rejeté",
    ),
    async () => {
      const schema = fullSchemaFrom(
        await import("@/lib/validators/opportunite"),
      )
      const valid = {
        body: "Dossier de candidature complet",
        coverImage: null,
        deadline: "2026-12-31T23:59:59.000Z",
        excerpt: "Extrait public",
        externalUrl: "https://example.test/candidature",
        id: "opportunite-full",
        organisme: "Synapse",
        slug: "opportunite-full",
        summary: "Résumé public",
        title: "Opportunité complète",
        type: "STAGE",
        visibility: "PREMIUM",
      }

      expect(schema.safeParse(valid).success).toBe(true)
      for (const externalUrl of [
        "http://example.test/candidature",
        "javascript:alert(1)",
        "data:text/html,contenu",
        "ftp://example.test/candidature",
      ]) {
        expect(schema.safeParse({ ...valid, externalUrl }).success).toBe(false)
      }
    },
  )
})
