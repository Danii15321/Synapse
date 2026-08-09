import "server-only"

import type { Prisma } from "@prisma/client"

import type { JeuListQuery } from "@/lib/validators/jeu"
import { db } from "@/server/db"

const jeuCardSelect = {
  capacity: true,
  closesAt: true,
  coverImage: true,
  id: true,
  location: true,
  slug: true,
  startsAt: true,
  summary: true,
  title: true,
  visibility: true,
} satisfies Prisma.JeuSelect

type JeuCardRow = Prisma.JeuGetPayload<{ select: typeof jeuCardSelect }>

export function findMany(options: JeuListQuery): Promise<JeuCardRow[]> {
  return db.jeu.findMany({
    cursor: options.cursor ? { id: options.cursor } : undefined,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    select: jeuCardSelect,
    skip: options.cursor ? 1 : undefined,
    take: options.take,
    where: { publishedAt: { not: null } },
  })
}

export function findMetaBySlug(slug: string) {
  return db.jeu.findUnique({
    select: { visibility: true },
    where: { slug, publishedAt: { not: null } },
  })
}

export function findBySlug(
  slug: string,
  options: Readonly<{ includeBody: boolean }>,
) {
  return db.jeu.findUnique({
    select: {
      body: options.includeBody,
      capacity: true,
      closesAt: true,
      coverImage: true,
      excerpt: true,
      id: true,
      location: true,
      slug: true,
      startsAt: true,
      summary: true,
      title: true,
      visibility: true,
    },
    where: { slug, publishedAt: { not: null } },
  })
}

export function findParticipationMetaBySlug(slug: string) {
  return db.jeu.findUnique({
    select: {
      capacity: true,
      closesAt: true,
      id: true,
      location: true,
      publishedAt: true,
      startsAt: true,
      title: true,
      visibility: true,
    },
    where: { slug },
  })
}
