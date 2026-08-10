import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { promptResourceSchema } from "@/lib/validators/prompt"

const ROOT = process.cwd()
const IMPORT_GUIDE = path.join(ROOT, "docs", "import-ressources.md")

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

const VALID_PROMPT_RESOURCE = {
  body: "Un corps synthétique réservé au contrat de validation.",
  coverImage: null,
  domain: "ia",
  excerpt: "Extrait public synthétique",
  publishedAt: "2026-08-01",
  slug: "test-contrat-prompt",
  summary: "Résumé public synthétique",
  tags: ["contrat", "ia"],
  title: "Tester le contrat Prompt",
} as const

describe("contrat éditorial de la rubrique Prompts", () => {
  it(
    scenario(
      "Le guide versionné documente la source éditoriale privée et son import",
      "un clone frais volontairement dépourvu du dossier ressources",
      "la procédure d'approvisionnement et de réimport suivie par Git est lue",
      "elle assume l'absence des corps réels, désigne uniquement ressources/PROMPTS, décrit le format Markdown non fiable et la commande de seed sans réhabiliter l'ancien dossier lowercase",
    ),
    async () => {
      const guide = await readFile(IMPORT_GUIDE, "utf8")

      expect(guide).toMatch(/contenu éditorial[\s\S]*hors Git/i)
      expect(guide).toMatch(/clone frais[\s\S]*aucun prompt réel/i)
      expect(guide).toContain("ressources/PROMPTS/")
      expect(guide).toMatch(
        /ressources\/prompts\/[\s\S]*ne sont pas des sources du seed v1/i,
      )
      for (const marker of ["##", "Modèle Cible :", "### Prompt :"]) {
        expect(guide).toContain(marker)
      }
      expect(guide).toMatch(/entrées non fiables[\s\S]*validées/i)
      expect(guide).toContain("npx prisma db seed")
      expect(guide).toMatch(
        /sans changer leurs identifiants ni créer de\s+doublons/i,
      )
    },
  )

  it(
    scenario(
      "Le validateur accepte des ressources synthétiques FREE et PREMIUM complètes",
      "deux fixtures sans contenu éditorial réel qui ne diffèrent que par leur visibilité explicite",
      "le schéma Zod strict de ressource les parse puis reçoit des formes incomplètes",
      "FREE et PREMIUM exigent toutes deux un corps non vide et une visibilité présente",
    ),
    () => {
      const free = promptResourceSchema.safeParse({
        ...VALID_PROMPT_RESOURCE,
        visibility: "FREE",
      })
      const premium = promptResourceSchema.safeParse({
        ...VALID_PROMPT_RESOURCE,
        visibility: "PREMIUM",
      })

      expect(free.success).toBe(true)
      expect(premium.success).toBe(true)
      expect(
        promptResourceSchema.safeParse({
          ...VALID_PROMPT_RESOURCE,
          body: "",
          visibility: "FREE",
        }).success,
      ).toBe(false)
      expect(
        promptResourceSchema.safeParse(VALID_PROMPT_RESOURCE).success,
      ).toBe(false)
    },
  )

  it(
    scenario(
      "La frontière d'import normalise les tags et refuse domaines, auteurs et champs inconnus",
      "une ressource synthétique avec espaces, accents, casse, doublons et valeurs vides",
      "le schéma Zod strict de ressource la parse puis reçoit des variantes invalides",
      "les tags deviennent etude et ia une seule fois, tandis qu'un domaine libre, author et tout champ inconnu sont rejetés",
    ),
    () => {
      const valid = {
        ...VALID_PROMPT_RESOURCE,
        tags: ["  ÉTUDE  ", "etude", "", " IA ", "ia"],
        visibility: "FREE",
      }

      const parsed = promptResourceSchema.safeParse(valid)
      expect(parsed.success).toBe(true)
      if (!parsed.success) {
        throw new Error("la ressource conforme doit être acceptée")
      }
      expect(parsed.data.tags).toEqual(["etude", "ia"])
      expect(
        promptResourceSchema.safeParse({
          ...valid,
          domain: "marketing",
        }).success,
      ).toBe(false)
      expect(
        promptResourceSchema.safeParse({
          ...valid,
          author: "Auteur inventé",
        }).success,
      ).toBe(false)
      expect(
        promptResourceSchema.safeParse({ ...valid, extra: true }).success,
      ).toBe(false)
    },
  )
})
