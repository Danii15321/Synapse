import "server-only"

import { db } from "@/server/db"

const RECENT_CONTENT_LIMIT = 3

export async function getHomeOverview() {
  const [promptCount, recentPrompts] = await db.$transaction([
    db.prompt.count({ where: { publishedAt: { not: null } } }),
    db.prompt.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        coverImage: true,
        domain: true,
        id: true,
        slug: true,
        summary: true,
        tags: true,
        title: true,
        visibility: true,
      },
      take: RECENT_CONTENT_LIMIT,
      where: { publishedAt: { not: null } },
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
