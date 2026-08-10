import { z } from "zod"

export const premiumOfferSchema = z
  .object({
    counts: z
      .object({
        formations: z.number().int().nonnegative(),
        jeux: z.number().int().nonnegative(),
        opportunites: z.number().int().nonnegative(),
        prompts: z.number().int().nonnegative(),
      })
      .strict(),
    price: z
      .object({
        amount: z.number().int().positive(),
        currency: z.literal("XOF"),
      })
      .strict(),
  })
  .strict()

export type PremiumOffer = z.infer<typeof premiumOfferSchema>
