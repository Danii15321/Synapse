import "server-only"

import { db } from "@/server/db"

const PROMPT_LIST_LIMIT = 100

export function findMany() {
  return db.prompt.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
    },
    take: PROMPT_LIST_LIMIT,
  })
}
