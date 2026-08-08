import "server-only"

import { z } from "zod"

const configSchema = z
  .object({
    AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SITE_URL: z.string().url(),
    VERCEL: z.literal("1").optional(),
  })
  .strict()

export const config = configSchema.parse({
  AUTH_SECRET: process.env.AUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  SITE_URL: process.env.SITE_URL,
  VERCEL: process.env.VERCEL,
})
