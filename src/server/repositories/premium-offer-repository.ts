import "server-only"

import { db } from "@/server/db"

const PUBLISHED_PREMIUM = {
  publishedAt: { not: null },
  visibility: "PREMIUM" as const,
}

export async function getPremiumContentCounts() {
  const [prompts, formations, jeux, opportunites] = await db.$transaction([
    db.prompt.count({ where: PUBLISHED_PREMIUM }),
    db.formation.count({ where: PUBLISHED_PREMIUM }),
    db.jeu.count({ where: PUBLISHED_PREMIUM }),
    db.opportunite.count({ where: PUBLISHED_PREMIUM }),
  ])

  return { formations, jeux, opportunites, prompts }
}
