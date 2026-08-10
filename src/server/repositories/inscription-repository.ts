import "server-only"

import { Prisma } from "@prisma/client"

import { db } from "@/server/db"

export type ReservationResult = Readonly<{
  status: "ALREADY_REGISTERED" | "CREATED" | "FULL"
}>

type ParticipationCursor = Readonly<{
  createdAt: Date
  id: string
  type: "FORMATION" | "JEU"
}>

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

export async function reserveJeuPlace(input: {
  capacity: number | null
  jeuId: string
  userId: string
}): Promise<ReservationResult> {
  try {
    return await db.$transaction(async (transaction) => {
      // Prisma n'expose pas de verrou de ligne. Ce verrou sérialise le comptage
      // et l'insertion sur un même jeu afin que la dernière place soit unique.
      await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Jeu" WHERE "id" = ${input.jeuId} FOR UPDATE
      `

      const existing = await transaction.inscription.findUnique({
        select: { id: true },
        where: {
          userId_jeuId: { jeuId: input.jeuId, userId: input.userId },
        },
      })
      if (existing) return { status: "ALREADY_REGISTERED" }

      if (input.capacity !== null) {
        const count = await transaction.inscription.count({
          where: { jeuId: input.jeuId },
        })
        if (count >= input.capacity) return { status: "FULL" }
      }

      await transaction.inscription.create({
        data: { jeuId: input.jeuId, userId: input.userId },
        select: { id: true },
      })
      return { status: "CREATED" }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "ALREADY_REGISTERED" }
    }
    throw error
  }
}

export async function reserveFormationParticipation(input: {
  formationId: string
  userId: string
}): Promise<ReservationResult> {
  try {
    await db.formationInscription.create({
      data: input,
      select: { id: true },
    })
    return { status: "CREATED" }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "ALREADY_REGISTERED" }
    }
    throw error
  }
}

export async function hasJeuParticipation(input: {
  jeuId: string
  userId: string
}): Promise<boolean> {
  const row = await db.inscription.findUnique({
    select: { id: true },
    where: { userId_jeuId: input },
  })
  return row !== null
}

export async function hasFormationParticipation(input: {
  formationId: string
  userId: string
}): Promise<boolean> {
  const row = await db.formationInscription.findUnique({
    select: { id: true },
    where: { userId_formationId: input },
  })
  return row !== null
}

export async function hasParticipationBySlug(input: {
  activityType: "FORMATION" | "JEU"
  slug: string
  userId: string
}): Promise<boolean> {
  if (input.activityType === "JEU") {
    const row = await db.inscription.findFirst({
      select: { id: true },
      where: { jeu: { slug: input.slug }, userId: input.userId },
    })
    return row !== null
  }

  const row = await db.formationInscription.findFirst({
    select: { id: true },
    where: { formation: { slug: input.slug }, userId: input.userId },
  })
  return row !== null
}

export function countJeuParticipations(jeuId: string): Promise<number> {
  return db.inscription.count({ where: { jeuId } })
}

export async function cancelJeuParticipation(input: {
  jeuId: string
  userId: string
}): Promise<boolean> {
  const result = await db.inscription.deleteMany({ where: input })
  return result.count > 0
}

export async function cancelFormationParticipation(input: {
  formationId: string
  userId: string
}): Promise<boolean> {
  const result = await db.formationInscription.deleteMany({ where: input })
  return result.count > 0
}

async function resolveCursor(
  cursor: string | undefined,
  userId: string,
): Promise<ParticipationCursor | null> {
  if (!cursor) return null

  const separator = cursor.indexOf(":")
  const type = cursor.slice(0, separator)
  const id = cursor.slice(separator + 1)
  if (separator < 1 || !id) return null

  if (type === "JEU") {
    const row = await db.inscription.findFirst({
      select: { createdAt: true, id: true },
      where: { id, userId },
    })
    return row ? { ...row, type: "JEU" } : null
  }
  if (type === "FORMATION") {
    const row = await db.formationInscription.findFirst({
      select: { createdAt: true, id: true },
      where: { id, userId },
    })
    return row ? { ...row, type: "FORMATION" } : null
  }
  return null
}

function beforeCursorWhere(cursor: ParticipationCursor | null) {
  if (!cursor) return undefined
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  }
}

export async function findManyByUserId(input: {
  cursor?: string
  take: number
  userId: string
}) {
  const cursor = await resolveCursor(input.cursor, input.userId)
  const beforeCursor = beforeCursorWhere(cursor)
  const limit = input.take + 1
  const [jeux, formations] = await Promise.all([
    db.inscription.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
        id: true,
        jeu: {
          select: {
            location: true,
            slug: true,
            startsAt: true,
            title: true,
          },
        },
      },
      take: limit,
      where: { AND: [{ userId: input.userId }, beforeCursor ?? {}] },
    }),
    db.formationInscription.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        createdAt: true,
        formation: {
          select: {
            format: true,
            slug: true,
            startsAt: true,
            title: true,
          },
        },
        id: true,
      },
      take: limit,
      where: { AND: [{ userId: input.userId }, beforeCursor ?? {}] },
    }),
  ])

  const merged = [
    ...jeux.map((row) => ({
      activityType: "JEU" as const,
      createdAt: row.createdAt,
      id: row.id,
      location: row.jeu.location,
      slug: row.jeu.slug,
      startsAt: row.jeu.startsAt,
      title: row.jeu.title,
    })),
    ...formations.map((row) => ({
      activityType: "FORMATION" as const,
      createdAt: row.createdAt,
      format: row.formation.format,
      id: row.id,
      slug: row.formation.slug,
      startsAt: row.formation.startsAt,
      title: row.formation.title,
    })),
  ].sort((first, second) => {
    const byDate = second.createdAt.getTime() - first.createdAt.getTime()
    return byDate === 0 ? second.id.localeCompare(first.id) : byDate
  })

  const pageRows = merged.slice(0, input.take)
  const hasNextPage = merged.length > input.take
  return {
    items: pageRows.map((item) =>
      item.activityType === "FORMATION"
        ? {
            activityType: "FORMATION" as const,
            format: item.format,
            id: item.id,
            slug: item.slug,
            startsAt: item.startsAt,
            title: item.title,
          }
        : {
            activityType: "JEU" as const,
            id: item.id,
            location: item.location,
            slug: item.slug,
            startsAt: item.startsAt,
            title: item.title,
          },
    ),
    nextCursor: hasNextPage
      ? `${pageRows.at(-1)?.activityType}:${pageRows.at(-1)?.id}`
      : null,
  }
}
