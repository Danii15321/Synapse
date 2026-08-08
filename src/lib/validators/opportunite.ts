import { z } from "zod"

import { visibilitySchema } from "@/lib/validators/prompt"

export const opportuniteTypeSchema = z.enum([
  "STAGE",
  "EMPLOI",
  "APPEL_OFFRE",
  "FINANCEMENT",
  "COLLABORATION",
])

const isoDateTimeSchema = z.string().datetime({ offset: true })
const httpsUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2_048)
  .refine((value) => new URL(value).protocol === "https:", {
    message: "Le lien de candidature doit utiliser HTTPS.",
  })
const optionalQueryText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(200).optional(),
)

const opportunitePublicFields = {
  coverImage: z.string().min(1).nullable(),
  deadline: isoDateTimeSchema.nullable(),
  id: z.string().min(1),
  organisme: z.string(),
  slug: z.string().min(1),
  summary: z.string(),
  title: z.string(),
  type: opportuniteTypeSchema,
  visibility: visibilitySchema,
} as const

export const opportuniteCardSchema = z.object(opportunitePublicFields).strict()

export const opportuniteTeaserSchema = z
  .object({
    ...opportunitePublicFields,
    excerpt: z.string().nullable(),
  })
  .strict()

export const opportuniteFullSchema = opportuniteTeaserSchema
  .extend({
    body: z.string(),
    externalUrl: httpsUrlSchema.nullable(),
  })
  .strict()

export const opportuniteCatalogPageSchema = z
  .object({
    items: z.array(opportuniteCardSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export const opportuniteListQuerySchema = z
  .object({
    cursor: optionalQueryText,
    search: optionalQueryText,
    take: z.coerce.number().int().min(1).max(100).default(24),
    type: z.preprocess(
      (value) => (value === "" ? undefined : value),
      opportuniteTypeSchema.optional(),
    ),
  })
  .strict()

export const opportuniteSlugParamsSchema = z
  .object({ slug: z.string().min(1).max(200) })
  .strict()

const opportuniteCoverImageSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    /^\/images\/opportunites\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/u,
    "L'image doit être un fichier local sous /images/opportunites/.",
  )

export const opportuniteResourceSchema = z
  .object({
    body: z.string().trim().min(1).max(50_000),
    coverImage: opportuniteCoverImageSchema.nullable(),
    deadline: isoDateTimeSchema.nullable(),
    excerpt: z.string().trim().min(1).max(1_200).nullable(),
    externalUrl: httpsUrlSchema.nullable(),
    organisme: z.string().trim().min(1).max(200),
    publishedAt: z.string().date().nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    summary: z.string().trim().min(1).max(400),
    title: z.string().trim().min(1).max(200),
    type: opportuniteTypeSchema,
    visibility: visibilitySchema,
  })
  .strict()

export type OpportuniteCardDto = z.infer<typeof opportuniteCardSchema>
export type OpportuniteCatalogPage = z.infer<
  typeof opportuniteCatalogPageSchema
>
export type OpportuniteFull = z.infer<typeof opportuniteFullSchema>
export type OpportuniteListQuery = z.infer<typeof opportuniteListQuerySchema>
export type OpportuniteTeaser = z.infer<typeof opportuniteTeaserSchema>
