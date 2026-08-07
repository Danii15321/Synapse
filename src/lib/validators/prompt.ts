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

export type PromptDto = z.infer<typeof promptDtoSchema>
