import { z } from "zod"

export const promptDomainSchema = z.enum([
  "ia",
  "entrepreneuriat",
  "productivite",
  "communication",
])

export const visibilitySchema = z.enum(["FREE", "PREMIUM"])

export const promptCardSchema = z
  .object({
    coverImage: z.string().min(1).nullable(),
    domain: promptDomainSchema,
    id: z.string().min(1),
    slug: z.string().min(1),
    summary: z.string(),
    tags: z.array(z.string()),
    title: z.string(),
    visibility: visibilitySchema,
  })
  .strict()

const optionalQueryText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(200).optional(),
)

export const promptListQuerySchema = z
  .object({
    cursor: optionalQueryText,
    domain: z.preprocess(
      (value) => (value === "" ? undefined : value),
      promptDomainSchema.optional(),
    ),
    search: optionalQueryText,
    tag: optionalQueryText,
    take: z.coerce.number().int().min(1).max(100).default(24),
  })
  .strict()

export const promptCatalogPageSchema = z
  .object({
    items: z.array(promptCardSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export const promptTeaserSchema = z
  .object({
    coverImage: z.string().min(1).nullable(),
    domain: promptDomainSchema,
    excerpt: z.string().nullable(),
    id: z.string(),
    slug: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    title: z.string(),
    visibility: visibilitySchema,
  })
  .strict()

export const promptFullSchema = promptTeaserSchema
  .extend({
    body: z.string(),
  })
  .strict()

export const promptSlugParamsSchema = z
  .object({
    slug: z.string().min(1).max(200),
  })
  .strict()

function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
}

const normalizedTagsSchema = z
  .array(z.string().max(80))
  .max(20)
  .transform((tags) => [...new Set(tags.map(normalizeTag).filter(Boolean))])

const promptCoverImageSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    /^\/images\/prompts\/[a-zA-Z0-9][a-zA-Z0-9/_-]*\.(?:avif|jpe?g|png|webp)$/u,
    "L'image doit etre un fichier local sous /images/prompts/.",
  )

export const promptResourceSchema = z
  .object({
    body: z.string().trim().min(1).max(50_000),
    coverImage: promptCoverImageSchema.nullable(),
    domain: promptDomainSchema,
    excerpt: z.string().trim().min(1).max(1_200).nullable(),
    publishedAt: z.string().date().nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    summary: z.string().trim().min(1).max(400),
    tags: normalizedTagsSchema,
    title: z.string().trim().min(1).max(200),
    visibility: visibilitySchema,
  })
  .strict()

export type PromptDomain = z.infer<typeof promptDomainSchema>
export type PromptCardDto = z.infer<typeof promptCardSchema>
export type PromptListQuery = z.infer<typeof promptListQuerySchema>
export type PromptCatalogPage = z.infer<typeof promptCatalogPageSchema>
export type Visibility = z.infer<typeof visibilitySchema>
export type PromptTeaser = z.infer<typeof promptTeaserSchema>
export type PromptFull = z.infer<typeof promptFullSchema>
