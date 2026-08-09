import "server-only"

import type { Prisma } from "@prisma/client"

import type { FormationListQuery } from "@/lib/validators/formation"
import { db } from "@/server/db"

const formationCardSelect = {
  coverImage: true,
  durationH: true,
  format: true,
  id: true,
  kind: true,
  level: true,
  slug: true,
  startsAt: true,
  summary: true,
  title: true,
  visibility: true,
} satisfies Prisma.FormationSelect

type FormationCardRow = Prisma.FormationGetPayload<{
  select: typeof formationCardSelect
}>

function availableFormationWhere(
  now: Date,
  filters: Pick<FormationListQuery, "kind" | "level" | "search"> = {},
): Prisma.FormationWhereInput {
  return {
    AND: [
      {
        OR: [
          { kind: "PERMANENTE" },
          { kind: "EVENEMENTIELLE", startsAt: { gt: now } },
        ],
      },
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
            ],
          }
        : {},
    ],
    kind: filters.kind,
    level: filters.level,
    publishedAt: { not: null },
  }
}

export function findMany(
  options: FormationListQuery,
): Promise<FormationCardRow[]> {
  return db.formation.findMany({
    cursor: options.cursor ? { id: options.cursor } : undefined,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: formationCardSelect,
    skip: options.cursor ? 1 : undefined,
    take: options.take,
    where: availableFormationWhere(new Date(), options),
  })
}

export function findMetaBySlug(slug: string) {
  return db.formation.findUnique({
    select: { visibility: true },
    where: {
      AND: availableFormationWhere(new Date()),
      slug,
    },
  })
}

export function findBySlug(
  slug: string,
  options: Readonly<{ includeBody: boolean }>,
) {
  return db.formation.findUnique({
    select: {
      body: options.includeBody,
      coverImage: true,
      durationH: true,
      excerpt: true,
      format: true,
      id: true,
      kind: true,
      level: true,
      slug: true,
      startsAt: true,
      summary: true,
      title: true,
      visibility: true,
    },
    where: {
      AND: availableFormationWhere(new Date()),
      slug,
    },
  })
}

export function findParticipationMetaBySlug(slug: string) {
  return db.formation.findUnique({
    select: {
      format: true,
      id: true,
      kind: true,
      publishedAt: true,
      startsAt: true,
      title: true,
      visibility: true,
    },
    where: { slug },
  })
}
