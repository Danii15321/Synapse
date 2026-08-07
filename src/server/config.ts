import "server-only"

import { z } from "zod"

const configSchema = z
  .object({
    DATABASE_URL: z.string().url().startsWith("postgresql://"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  })
  .strict()

export const config = configSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
})
