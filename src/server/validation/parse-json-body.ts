import "server-only"

import { z } from "zod"

import { ValidationError } from "@/server/errors"

export async function parseJsonBody(
  request: Request,
  schema: z.ZodType<unknown>,
): Promise<unknown> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Le corps JSON est invalide")
  }

  const inputSchema = schema instanceof z.ZodObject ? schema.strict() : schema
  const result = inputSchema.safeParse(body)

  if (!result.success) {
    throw new ValidationError("Les données reçues sont invalides")
  }

  return result.data
}
