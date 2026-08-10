import { z } from "zod"

import { promptDomainSchema, visibilitySchema } from "@/lib/validators/prompt"

export const resourceImportInputSchema = z
  .object({
    directory: z.string().trim().min(1),
  })
  .strict()

export const promptImportRowSchema = z
  .object({
    body: z.string().trim().min(1).max(50_000),
    coverImage: z.string().min(1).max(255).nullable(),
    domain: promptDomainSchema,
    excerpt: z.string().trim().min(1).max(1_200),
    publishedAt: z.date(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    summary: z.string().trim().min(1).max(400),
    tags: z.array(z.string().trim().min(1).max(80)).max(20),
    title: z.string().trim().min(1).max(200),
    visibility: visibilitySchema,
  })
  .strict()

const rubricDistributionSchema = z
  .object({
    FREE: z.number().int().nonnegative(),
    PREMIUM: z.number().int().nonnegative(),
  })
  .strict()

export const resourceImportReportSchema = z
  .object({
    distribution: z
      .object({
        formations: rubricDistributionSchema,
        jeux: rubricDistributionSchema,
        opportunites: rubricDistributionSchema,
        prompts: rubricDistributionSchema,
      })
      .strict(),
    imported: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    updated: z.number().int().nonnegative(),
  })
  .strict()

export type PromptImportRow = z.infer<typeof promptImportRowSchema>
export type ResourceImportInput = z.infer<typeof resourceImportInputSchema>
export type ResourceImportReport = z.infer<typeof resourceImportReportSchema>
