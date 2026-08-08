import { PrismaClient } from "@prisma/client"

import { assertSafeTestDatabaseTarget } from "./test-database-guard"

export default async function setup(): Promise<void> {
  assertSafeTestDatabaseTarget(process.env.DATABASE_URL)
  const db = new PrismaClient()

  try {
    await db.rateLimit.deleteMany()
  } finally {
    await db.$disconnect()
  }
}
