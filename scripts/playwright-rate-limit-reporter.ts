import { PrismaClient } from "@prisma/client"
import type { Reporter } from "@playwright/test/reporter"

import { assertSafeTestDatabaseTarget } from "./test-database-guard"

export default class RateLimitResetReporter implements Reporter {
  private readonly db: PrismaClient

  constructor() {
    assertSafeTestDatabaseTarget(process.env.DATABASE_URL)
    this.db = new PrismaClient()
  }

  async onTestEnd(): Promise<void> {
    await this.db.rateLimit.deleteMany()
  }

  async onEnd(): Promise<void> {
    await this.db.$disconnect()
  }
}
