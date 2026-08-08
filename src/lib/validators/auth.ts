import { z } from "zod"

const emailSchema = z.string().trim().email().max(254).toLowerCase()
const passwordSchema = z.string().min(12).max(128)

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
    email: emailSchema,
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

export const authMessageSchema = z
  .object({
    message: z.string(),
  })
  .passthrough()

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type SessionUser = z.infer<typeof sessionUserSchema>
