import { z } from "zod"

export const premiumContactSchema = z
  .object({
    email: z.string().trim().email().max(254),
    fullName: z.string().trim().min(1).max(120),
    paymentMethod: z.enum(["WAVE", "MOBILE_MONEY"]),
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^\+[1-9]\d{7,14}$/u),
  })
  .strict()

export type PremiumContactInput = z.infer<typeof premiumContactSchema>
