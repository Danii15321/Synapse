import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { formationResourceSchema } from "@/lib/validators/formation"
import {
  opportuniteFullSchema,
  opportuniteResourceSchema,
  opportuniteTeaserSchema,
} from "@/lib/validators/opportunite"

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

const FORMATION_RESOURCE = {
  body: "Programme synthétique réservé au contrat de validation.",
  coverImage: null,
  durationH: 4,
  excerpt: "Extrait public synthétique",
  format: "EN_LIGNE",
  level: "DEBUTANT",
  publishedAt: "2026-08-08",
  slug: "formation-test",
  summary: "Résumé public synthétique",
  title: "Formation synthétique",
} as const

const OPPORTUNITE_RESOURCE = {
  body: "Modalités synthétiques réservées au contrat de validation.",
  coverImage: null,
  deadline: null,
  excerpt: "Extrait public synthétique",
  externalUrl: "https://example.com/candidature",
  organisme: "Organisme synthétique",
  publishedAt: "2026-08-08",
  slug: "opportunite-test",
  summary: "Résumé public synthétique",
  title: "Opportunité synthétique",
} as const

describe("contrats éditoriaux Formations et Opportunités", () => {
  it(
    scenario(
      "Le guide versionné assume l'absence de ressources et de démonstrations",
      "aucune Formation, Opportunité ou Jeu réel n'est fourni dans le dépôt",
      "la procédure d'import versionnée est inspectée",
      "seule la source uppercase PROMPTS est importée, les anciennes démonstrations sont supprimées et les trois rubriques restent explicitement à zéro",
    ),
    async () => {
      const guide = await readFile(IMPORT_GUIDE, "utf8")

      expect(guide).toMatch(
        /seuls les fichiers Markdown sous `ressources\/PROMPTS\/`/i,
      )
      expect(guide).toMatch(
        /toutes les anciennes données de\s+démonstration Formations, Opportunités et Jeux sont supprimés/i,
      )
      expect(guide).toMatch(
        /Formations, Opportunités et Jeux restent à 0 \/ 0/i,
      )
      expect(guide).toMatch(/clone CI ne contient jamais `ressources\/`/i)
    },
  )

  it(
    scenario(
      "Le validateur Formation couvre les deux natures et les deux visibilités",
      "deux fixtures synthétiques, une permanente FREE et une événementielle PREMIUM",
      "le schéma Zod strict de ressource les parse sans fichier éditorial local",
      "les deux natures et les deux niveaux d'accès restent explicites, avec startsAt cohérent",
    ),
    () => {
      const permanent = formationResourceSchema.safeParse({
        ...FORMATION_RESOURCE,
        kind: "PERMANENTE",
        startsAt: null,
        visibility: "FREE",
      })
      const event = formationResourceSchema.safeParse({
        ...FORMATION_RESOURCE,
        kind: "EVENEMENTIELLE",
        startsAt: "2026-12-12T10:00:00.000Z",
        visibility: "PREMIUM",
      })

      expect(permanent.success).toBe(true)
      expect(event.success).toBe(true)
      if (!permanent.success || !event.success) {
        throw new Error("les deux formes synthétiques doivent être acceptées")
      }
      expect(new Set([permanent.data.kind, event.data.kind])).toEqual(
        new Set(["PERMANENTE", "EVENEMENTIELLE"]),
      )
      expect(
        new Set([permanent.data.visibility, event.data.visibility]),
      ).toEqual(new Set(["FREE", "PREMIUM"]))
    },
  )

  it(
    scenario(
      "Le schéma Formation refuse les incohérences temporelles et champs inconnus",
      "une ressource permanente sans date et une événementielle avec date ISO",
      "le schéma Zod strict parse les formes valides puis leurs inverses",
      "les formes valides passent, startsAt présent sur PERMANENTE ou absent sur EVENEMENTIELLE échoue, comme tout champ inconnu",
    ),
    () => {
      const permanent = {
        ...FORMATION_RESOURCE,
        kind: "PERMANENTE",
        startsAt: null,
        visibility: "FREE",
      }
      const event = {
        ...FORMATION_RESOURCE,
        kind: "EVENEMENTIELLE",
        startsAt: "2026-12-12T10:00:00.000Z",
        visibility: "PREMIUM",
      }

      expect(formationResourceSchema.safeParse(permanent).success).toBe(true)
      expect(formationResourceSchema.safeParse(event).success).toBe(true)
      expect(
        formationResourceSchema.safeParse({
          ...permanent,
          startsAt: event.startsAt,
        }).success,
      ).toBe(false)
      expect(
        formationResourceSchema.safeParse({ ...event, startsAt: null }).success,
      ).toBe(false)
      expect(
        formationResourceSchema.safeParse({ ...permanent, extra: true })
          .success,
      ).toBe(false)
    },
  )

  it(
    scenario(
      "Les validateurs Opportunité couvrent le contrat éditorial et les champs verrouillés",
      "des fixtures synthétiques FREE et PREMIUM couvrant les cinq types, sans exemple réel",
      "la ressource stricte et les DTO teaser/full sont validés",
      "tous les types passent, la visibilité reste explicite et body/externalUrl sont absents du teaser mais obligatoires ensemble dans la forme complète",
    ),
    () => {
      const types = [
        "STAGE",
        "EMPLOI",
        "APPEL_OFFRE",
        "FINANCEMENT",
        "COLLABORATION",
      ] as const
      for (const type of types) {
        expect(
          opportuniteResourceSchema.safeParse({
            ...OPPORTUNITE_RESOURCE,
            type,
            visibility: type === "STAGE" ? "FREE" : "PREMIUM",
          }).success,
          type,
        ).toBe(true)
      }

      expect(
        opportuniteResourceSchema.safeParse({
          ...OPPORTUNITE_RESOURCE,
          type: "STAGE",
        }).success,
      ).toBe(false)
      expect(
        opportuniteResourceSchema.safeParse({
          coverImage: null,
          deadline: null,
          excerpt: "Extrait public synthétique",
          externalUrl: OPPORTUNITE_RESOURCE.externalUrl,
          organisme: OPPORTUNITE_RESOURCE.organisme,
          publishedAt: OPPORTUNITE_RESOURCE.publishedAt,
          slug: OPPORTUNITE_RESOURCE.slug,
          summary: OPPORTUNITE_RESOURCE.summary,
          title: OPPORTUNITE_RESOURCE.title,
          type: "STAGE",
          visibility: "FREE",
        }).success,
      ).toBe(false)

      const teaser = {
        coverImage: null,
        deadline: null,
        excerpt: "Extrait public synthétique",
        id: "opportunite-id",
        organisme: OPPORTUNITE_RESOURCE.organisme,
        slug: OPPORTUNITE_RESOURCE.slug,
        summary: OPPORTUNITE_RESOURCE.summary,
        title: OPPORTUNITE_RESOURCE.title,
        type: "STAGE",
        visibility: "PREMIUM",
      }
      const full = {
        ...teaser,
        body: OPPORTUNITE_RESOURCE.body,
        externalUrl: OPPORTUNITE_RESOURCE.externalUrl,
      }

      expect(opportuniteTeaserSchema.safeParse(teaser).success).toBe(true)
      expect(opportuniteTeaserSchema.safeParse(full).success).toBe(false)
      expect(opportuniteFullSchema.safeParse(teaser).success).toBe(false)
      expect(opportuniteFullSchema.safeParse(full).success).toBe(true)
    },
  )
})
