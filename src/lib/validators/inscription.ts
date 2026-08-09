import { z } from "zod"

export const participationMutationSchema = z.object({}).strict()

export const participationListQuerySchema = z
  .object({
    cursor: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.string().trim().min(1).max(500).optional(),
    ),
    take: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()

export const participationStateSchema = z.enum([
  "ALREADY_REGISTERED",
  "AVAILABLE",
  "CLOSED",
  "FULL",
  "PREMIUM_REQUIRED",
])

export const participationConfirmationSchema = z
  .object({
    activityType: z.enum(["FORMATION", "JEU"]).optional(),
    emailConfirmation: z.literal(false),
    location: z.string().nullable(),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    status: z.enum(["ALREADY_REGISTERED", "CREATED"]),
    title: z.string(),
  })
  .strict()

export const participationItemSchema = z
  .object({
    activityType: z.enum(["FORMATION", "JEU"]),
    id: z.string().min(1).optional(),
    location: z.string().nullable(),
    slug: z.string().min(1),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    title: z.string(),
  })
  .strict()

export const participationPageSchema = z
  .object({
    items: z.array(participationItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export type ParticipationConfirmation = z.infer<
  typeof participationConfirmationSchema
>
export type ParticipationListQuery = z.infer<
  typeof participationListQuerySchema
>
export type ParticipationPage = z.infer<typeof participationPageSchema>
export type ParticipationState = z.infer<typeof participationStateSchema>
