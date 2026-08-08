import "server-only"

import { db } from "@/server/db"

const RECENT_CONTENT_LIMIT = 3

export async function getHomeOverview() {
  const [promptCount, recentPrompts] = await db.$transaction([
    db.prompt.count(),
    db.prompt.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        summary: true,
        title: true,
      },
      take: RECENT_CONTENT_LIMIT,
    }),
  ])

  return {
    counts: {
      formations: 0,
      jeux: 0,
      opportunites: 0,
      prompts: promptCount,
    },
    recentPrompts,
  }
}
