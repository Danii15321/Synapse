import { z } from "zod"

import { visibilitySchema } from "@/lib/validators/prompt"

const isoDateTimeSchema = z.string().datetime({ offset: true })
const optionalQueryText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(200).optional(),
)

const jeuPublicFields = {
  capacity: z.number().int().nonnegative().nullable(),
  closesAt: isoDateTimeSchema.nullable(),
  coverImage: z
    .string()
    .min(1)
    .nullish()
    .transform((value) => value ?? null),
  id: z.string().min(1),
  location: z.string().nullable(),
  slug: z.string().min(1),
  startsAt: isoDateTimeSchema.nullable(),
  summary: z.string(),
  title: z.string(),
  visibility: visibilitySchema,
} as const

export const jeuCardSchema = z.object(jeuPublicFields).strict()

export const jeuTeaserSchema = z
  .object({
    ...jeuPublicFields,
    excerpt: z.string().nullable(),
  })
  .strict()

export const jeuFullSchema = jeuTeaserSchema
  .extend({ body: z.string() })
  .strict()

export const jeuCatalogPageSchema = z
  .object({
    items: z.array(jeuCardSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export const jeuListQuerySchema = z
  .object({
    cursor: optionalQueryText,
    take: z.coerce.number().int().min(1).max(100).default(24),
  })
  .strict()

export const jeuSlugParamsSchema = z
  .object({ slug: z.string().trim().min(1).max(200) })
  .strict()

export type JeuCardDto = z.infer<typeof jeuCardSchema>
export type JeuCatalogPage = z.infer<typeof jeuCatalogPageSchema>
export type JeuFull = z.infer<typeof jeuFullSchema>
export type JeuListQuery = z.infer<typeof jeuListQuerySchema>
export type JeuTeaser = z.infer<typeof jeuTeaserSchema>
