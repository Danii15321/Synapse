import { z } from "zod"

const localDatabaseTargetSchema = z
  .object({
    database: z.literal("synapse"),
    hostname: z.enum(["localhost", "127.0.0.1", "[::1]", "::1"]),
    port: z.literal("5432"),
    protocol: z.enum(["postgres:", "postgresql:"]),
    username: z.literal("synapse"),
  })
  .strict()

export function assertSafeTestDatabaseTarget(databaseUrl: unknown): void {
  const parsedUrl = z.string().url().safeParse(databaseUrl)
  if (!parsedUrl.success) {
    throw new Error("La base de test locale n'est pas explicitement reconnue.")
  }

  const url = new URL(parsedUrl.data)
  const target = localDatabaseTargetSchema.safeParse({
    database: url.pathname.replace(/^\//, ""),
    hostname: url.hostname,
    port: url.port,
    protocol: url.protocol,
    username: url.username,
  })

  if (!target.success) {
    throw new Error("La base de test locale n'est pas explicitement reconnue.")
  }
}
