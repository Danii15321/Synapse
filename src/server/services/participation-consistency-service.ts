import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import type { PendingParticipation } from "@/lib/validators/pending-participation"
import { hasParticipationBySlug } from "@/server/repositories/inscription-repository"

const MAX_ATTEMPTS = 5
const RETRY_DELAY_MS = 50

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
}

/**
 * Attend brièvement la visibilité d'une mutation keepalive lorsqu'un membre
 * quitte volontairement le détail avant la fin de la réponse HTTP.
 */
export async function waitForPendingParticipation(
  pending: PendingParticipation,
  user: SessionUser,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    if (await hasParticipationBySlug({ ...pending, userId: user.id })) return
    if (attempt < MAX_ATTEMPTS - 1) await delay()
  }
}
