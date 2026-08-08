import "server-only"

import { z } from "zod"

import { sessionUserSchema } from "@/lib/validators/auth"
import { auth } from "@/server/auth/config"
import { UnauthorizedError } from "@/server/errors"

const authenticatedSessionSchema = z
  .object({
    expires: z.coerce.date(),
    user: sessionUserSchema,
  })
  .passthrough()

export async function requireUser() {
  const parsed = authenticatedSessionSchema.safeParse(await auth())

  if (!parsed.success || parsed.data.expires.getTime() <= Date.now()) {
    throw new UnauthorizedError()
  }

  return parsed.data.user
}
