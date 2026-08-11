import { z } from "zod"

const emailSchema = z.string().trim().email().max(254).toLowerCase()
const passwordSchema = z.string().min(12).max(128)
const requiredNameSchema = z.string().trim().min(1).max(80)
const locationSchema = z.string().trim().min(1).max(100)
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/u)

export const professionalLevelSchema = z.enum([
  "ELEVE",
  "ETUDIANT",
  "DIPLOME",
  "AUTRE",
])

export const accountProfileSchema = z
  .object({
    city: locationSchema,
    country: locationSchema,
    email: emailSchema,
    firstName: requiredNameSchema,
    lastName: requiredNameSchema,
    phone: phoneSchema,
    professionalLevel: professionalLevelSchema,
  })
  .strict()

export const accountSchema = z
  .object({
    city: accountProfileSchema.shape.city.nullable(),
    country: accountProfileSchema.shape.country.nullable(),
    email: emailSchema,
    firstName: accountProfileSchema.shape.firstName.nullable(),
    id: z.string().min(1),
    lastName: accountProfileSchema.shape.lastName.nullable(),
    membership: z.enum(["FREE", "PREMIUM"]),
    phone: accountProfileSchema.shape.phone.nullable(),
    professionalLevel: professionalLevelSchema.nullable(),
  })
  .strict()

export const membershipSchema = z.enum(["FREE", "PREMIUM"])

export const sessionUserSchema = z
  .object({
    email: emailSchema,
    id: z.string().min(1),
    membership: membershipSchema,
  })
  .strict()

export const registerSchema = z
  .object({
    ...accountProfileSchema.shape,
    password: passwordSchema,
  })
  .strict()

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .strict()

export const deleteAccountSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
  })
  .strict()

export const authMessageSchema = z
  .object({
    message: z.string(),
  })
  .passthrough()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type AccountProfileInput = z.infer<typeof accountProfileSchema>
export type AccountDto = z.infer<typeof accountSchema>
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>
export type ProfessionalLevel = z.infer<typeof professionalLevelSchema>
export type SessionUser = z.infer<typeof sessionUserSchema>
