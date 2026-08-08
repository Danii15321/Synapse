import { z } from "zod"

export const promptDtoSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
  })
  .strict()

export const promptListSchema = z.array(promptDtoSchema)

export const visibilitySchema = z.enum(["FREE", "PREMIUM"])

export const promptTeaserSchema = z
  .object({
    excerpt: z.string(),
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

export type PromptDto = z.infer<typeof promptDtoSchema>
export type Visibility = z.infer<typeof visibilitySchema>
export type PromptTeaser = z.infer<typeof promptTeaserSchema>
export type PromptFull = z.infer<typeof promptFullSchema>
