import "server-only"

import type { Prisma } from "@prisma/client"

import type {
  PromptDomain,
  PromptListQuery,
} from "@/lib/validators/prompt"
import { db } from "@/server/db"

const catalogListSelect = {
  coverImage: true,
  domain: true,
  id: true,
  slug: true,
  summary: true,
  tags: true,
  title: true,
  visibility: true,
} satisfies Prisma.PromptSelect

const PROMPT_TAG_FILTER_LIMIT = 500
const RELATED_PROMPTS_MAX_TAKE = 3

type CatalogListRow = Prisma.PromptGetPayload<{
  select: typeof catalogListSelect
}>

export function findMany(options: PromptListQuery): Promise<CatalogListRow[]> {
  const where: Prisma.PromptWhereInput = {
    domain: options.domain,
    publishedAt: { not: null },
    tags: options.tag ? { has: options.tag } : undefined,
    OR: options.search
      ? [
          { title: { contains: options.search, mode: "insensitive" } },
          { summary: { contains: options.search, mode: "insensitive" } },
        ]
      : undefined,
  }

  return db.prompt.findMany({
    cursor: options.cursor ? { id: options.cursor } : undefined,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: catalogListSelect,
    skip: options.cursor ? 1 : undefined,
    take: options.take,
    where,
  })
}

export function findRelatedByDomain(
  options: Readonly<{
    domain: PromptDomain
    excludeId: string
    take: number
  }>,
): Promise<CatalogListRow[]> {
  return db.prompt.findMany({
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: catalogListSelect,
    take: Math.min(Math.max(options.take, 1), RELATED_PROMPTS_MAX_TAKE),
    where: {
      domain: options.domain,
      id: { not: options.excludeId },
      publishedAt: { not: null },
    },
  })
}

export function findMetaBySlug(slug: string) {
  return db.prompt.findUnique({
    where: { publishedAt: { not: null }, slug },
    select: {
      visibility: true,
    },
  })
}

export async function findPublishedTags(): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ tag: string }>>`
    SELECT DISTINCT unnest("tags") AS "tag"
    FROM "Prompt"
    WHERE "publishedAt" IS NOT NULL
    ORDER BY "tag" ASC
    LIMIT ${PROMPT_TAG_FILTER_LIMIT}
  `

  return rows.map((row) => row.tag)
}

export function findBySlug(
  slug: string,
  opts: Readonly<{ includeBody: boolean }>,
) {
  return db.prompt.findUnique({
    where: { publishedAt: { not: null }, slug },
    select: {
      coverImage: true,
      domain: true,
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
