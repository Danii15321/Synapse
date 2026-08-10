import { z } from "zod"

export const PENDING_PARTICIPATION_COOKIE = "synapse.pending-participation"

export const pendingParticipationSchema = z
  .object({
    activityType: z.enum(["FORMATION", "JEU"]),
    slug: z.string().trim().min(1).max(200),
  })
  .strict()

export type PendingParticipation = z.infer<typeof pendingParticipationSchema>

export function serializePendingParticipation(
  input: PendingParticipation,
): string {
  return encodeURIComponent(JSON.stringify(input))
}

export function parsePendingParticipation(
  value: string | undefined,
): PendingParticipation | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(value))
    const result = pendingParticipationSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
