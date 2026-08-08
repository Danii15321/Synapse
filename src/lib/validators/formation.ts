import { z } from "zod"

import { visibilitySchema } from "@/lib/validators/prompt"

export const formationLevelSchema = z.enum([
  "DEBUTANT",
  "INTERMEDIAIRE",
  "AVANCE",
])

export const formationFormatSchema = z.enum([
  "PRESENTIEL",
  "EN_LIGNE",
  "HYBRIDE",
])

export const formationKindSchema = z.enum(["PERMANENTE", "EVENEMENTIELLE"])

const isoDateTimeSchema = z.string().datetime({ offset: true })
const optionalQueryText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(200).optional(),
)

const formationPublicFields = {
  coverImage: z.string().min(1).nullable(),
  durationH: z.number().int().positive().nullable(),
  format: formationFormatSchema,
  id: z.string().min(1),
  kind: formationKindSchema,
  level: formationLevelSchema,
  slug: z.string().min(1),
  startsAt: isoDateTimeSchema.nullable(),
  summary: z.string(),
  title: z.string(),
  visibility: visibilitySchema,
} as const

export const formationCardSchema = z.object(formationPublicFields).strict()

export const formationTeaserSchema = z
  .object({
    ...formationPublicFields,
    excerpt: z.string().nullable(),
  })
  .strict()

export const formationFullSchema = formationTeaserSchema
  .extend({ body: z.string() })
  .strict()

export const formationCatalogPageSchema = z
  .object({
    items: z.array(formationCardSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export const formationListQuerySchema = z
  .object({
    cursor: optionalQueryText,
    kind: z.preprocess(
      (value) => (value === "" ? undefined : value),
      formationKindSchema.optional(),
    ),
    level: z.preprocess(
      (value) => (value === "" ? undefined : value),
      formationLevelSchema.optional(),
    ),
    search: optionalQueryText,
    take: z.coerce.number().int().min(1).max(100).default(24),
  })
  .strict()

export const formationSlugParamsSchema = z
  .object({ slug: z.string().min(1).max(200) })
  .strict()

const formationCoverImageSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    /^\/images\/formations\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/u,
    "L'image doit être un fichier local sous /images/formations/.",
  )

export const formationResourceSchema = z
  .object({
    body: z.string().trim().min(1).max(50_000),
    coverImage: formationCoverImageSchema.nullable(),
    durationH: z.number().int().positive().max(10_000).nullable(),
    excerpt: z.string().trim().min(1).max(1_200).nullable(),
    format: formationFormatSchema,
    kind: formationKindSchema,
    level: formationLevelSchema,
    publishedAt: z.string().date().nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    startsAt: isoDateTimeSchema
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    summary: z.string().trim().min(1).max(400),
    title: z.string().trim().min(1).max(200),
    visibility: visibilitySchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.kind === "PERMANENTE" && value.startsAt !== null) {
      context.addIssue({
        code: "custom",
        message: "Une formation permanente ne porte pas de date de session.",
        path: ["startsAt"],
      })
    }
    if (value.kind === "EVENEMENTIELLE" && value.startsAt === null) {
      context.addIssue({
        code: "custom",
        message: "Une formation événementielle exige une date de session.",
        path: ["startsAt"],
      })
    }
  })

export type FormationCardDto = z.infer<typeof formationCardSchema>
export type FormationCatalogPage = z.infer<typeof formationCatalogPageSchema>
export type FormationFull = z.infer<typeof formationFullSchema>
export type FormationListQuery = z.infer<typeof formationListQuerySchema>
export type FormationTeaser = z.infer<typeof formationTeaserSchema>
