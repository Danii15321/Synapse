import { z } from "zod"

export const contentDetailPathSchema = z
  .object({
    rubric: z.enum(["formations", "jeux", "opportunites", "prompts"]),
    slug: z.string().trim().min(1).max(200),
  })
  .strict()

export type ContentDetailPath = z.infer<typeof contentDetailPathSchema>
