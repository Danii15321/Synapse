import "server-only"

import { db } from "@/server/db"

export async function grantPremium(userId: string, source: string) {
  return db.$transaction(async (transaction) => {
    const promoted = await transaction.user.updateMany({
      data: { membership: "PREMIUM" },
      where: { id: userId, membership: "FREE" },
    })

    if (promoted.count === 0) {
      return { granted: false }
    }

    await transaction.membershipGrant.create({
      data: { source, userId },
      select: { id: true },
    })

    return { granted: true }
  })
}
