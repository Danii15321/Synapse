import { z } from "zod"

export const contentRubricSchema = z.enum([
  "formations",
  "jeux",
  "opportunites",
  "prompts",
])

export const contentDetailPathSchema = z
  .object({
    rubric: contentRubricSchema,
    slug: z.string().trim().min(1).max(200),
  })
  .strict()

export type ContentDetailPath = z.infer<typeof contentDetailPathSchema>
export type ContentRubric = z.infer<typeof contentRubricSchema>
