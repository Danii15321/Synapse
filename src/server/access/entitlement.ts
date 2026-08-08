import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import type { Visibility } from "@/lib/validators/prompt"

export function canAccess(
  user: SessionUser | null,
  content: Readonly<{ visibility: Visibility }>,
): boolean {
  if (content.visibility === "FREE") {
    return true
  }

  return user?.membership === "PREMIUM"
}
