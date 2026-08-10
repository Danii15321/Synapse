import { z } from "zod"

import { db } from "@/server/db"
import { findUserIdByEmail } from "@/server/repositories/user-repository"
import { membershipService } from "@/server/services/membership-service"

const emailSchema = z.string().trim().email().max(254).toLowerCase()
const SOURCE = "grant-premium-cli"

async function run(): Promise<void> {
  const parsedEmail = emailSchema.safeParse(process.argv[2])
  if (!parsedEmail.success) {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "invalid-email" })}\n`,
    )
    process.exitCode = 1
    return
  }

  const user = await findUserIdByEmail(parsedEmail.data)

  if (!user) {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "account-not-found" })}\n`,
    )
    process.exitCode = 1
    return
  }

  const result = await membershipService.grantPremium(user.id, SOURCE)

  process.stdout.write(
    `${JSON.stringify({
      email: parsedEmail.data,
      event: "membership.promotion",
      membership: "PREMIUM",
      occurredAt: new Date().toISOString(),
      source: SOURCE,
      status: result.granted ? "granted" : "already-premium",
    })}\n`,
  )
}

void run()
  .catch(() => {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "failed" })}\n`,
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
