import "server-only"

import { db } from "@/server/db"

type RecordRateLimitHitInput = Readonly<{
  identifier: string
  now: Date
  windowMs: number
}>

type RateLimitHit = Readonly<{
  count: number
  retryAfterSeconds: number
}>

export async function recordRateLimitHit({
  identifier,
  now,
  windowMs,
}: RecordRateLimitHitInput): Promise<RateLimitHit> {
  const expiresAt = new Date(now.getTime() + windowMs)

  return db.$transaction(async (transaction) => {
    await transaction.rateLimit.deleteMany({
      where: {
        identifier,
        expiresAt: { lte: now },
      },
    })

    const hit = await transaction.rateLimit.upsert({
      where: { identifier },
      create: {
        count: 1,
        expiresAt,
        identifier,
        windowStart: now,
      },
      update: {
        count: { increment: 1 },
      },
      select: {
        count: true,
        expiresAt: true,
      },
    })

    return {
      count: hit.count,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((hit.expiresAt.getTime() - now.getTime()) / 1_000),
      ),
    }
  })
}

export async function purgeExpiredRateLimits(now: Date): Promise<number> {
  const result = await db.rateLimit.deleteMany({
    where: { expiresAt: { lte: now } },
  })

  return result.count
}
