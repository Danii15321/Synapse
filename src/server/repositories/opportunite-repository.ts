import "server-only"

import type { Prisma } from "@prisma/client"

import type { OpportuniteListQuery } from "@/lib/validators/opportunite"
import { db } from "@/server/db"

const opportuniteCardSelect = {
  coverImage: true,
  deadline: true,
  id: true,
  organisme: true,
  slug: true,
  summary: true,
  title: true,
  type: true,
  visibility: true,
} satisfies Prisma.OpportuniteSelect

type OpportuniteCardRow = Prisma.OpportuniteGetPayload<{
  select: typeof opportuniteCardSelect
}>

function availableOpportuniteWhere(
  now: Date,
  filters: Pick<OpportuniteListQuery, "search" | "type"> = {},
): Prisma.OpportuniteWhereInput {
  return {
    AND: [
      { OR: [{ deadline: null }, { deadline: { gt: now } }] },
      filters.search
        ? {
            OR: [
              {
                title: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                summary: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
              {
                organisme: {
                  contains: filters.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {},
    ],
    publishedAt: { not: null },
    type: filters.type,
  }
}

export function findMany(
  options: OpportuniteListQuery,
): Promise<OpportuniteCardRow[]> {
  return db.opportunite.findMany({
    cursor: options.cursor ? { id: options.cursor } : undefined,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: opportuniteCardSelect,
    skip: options.cursor ? 1 : undefined,
    take: options.take,
    where: availableOpportuniteWhere(new Date(), options),
  })
}

export function findMetaBySlug(slug: string) {
  return db.opportunite.findUnique({
    select: { visibility: true },
    where: {
      AND: availableOpportuniteWhere(new Date()),
      slug,
    },
  })
}

export function findBySlug(
  slug: string,
  options: Readonly<{ includeLockedFields: boolean }>,
) {
  return db.opportunite.findUnique({
    select: {
      body: options.includeLockedFields,
      coverImage: true,
      deadline: true,
      excerpt: true,
      externalUrl: options.includeLockedFields,
      id: true,
      organisme: true,
      slug: true,
      summary: true,
      title: true,
      type: true,
      visibility: true,
    },
    where: {
      AND: availableOpportuniteWhere(new Date()),
      slug,
    },
  })
}

