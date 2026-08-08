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

export function findMetaBySlug(slug: string) {
  return db.prompt.findUnique({
    where: { slug },
    select: {
      visibility: true,
    },
  })
}

export function findBySlug(
  slug: string,
  opts: Readonly<{ includeBody: boolean }>,
) {
  return db.prompt.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      excerpt: true,
      tags: true,
      visibility: true,
      body: opts.includeBody,
    },
  })
}
