import { PrismaClient } from "@prisma/client"
import { z } from "zod"

const emailSchema = z.string().trim().email().max(254).toLowerCase()
const db = new PrismaClient()

async function grantPremium(): Promise<void> {
  const parsedEmail = emailSchema.safeParse(process.argv[2])
  if (!parsedEmail.success) {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "invalid-email" })}\n`,
    )
    process.exitCode = 1
    return
  }

  const result = await db.user.updateMany({
    where: { email: parsedEmail.data },
    data: { membership: "PREMIUM" },
  })

  if (result.count !== 1) {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "account-not-found" })}\n`,
    )
    process.exitCode = 1
    return
  }

  process.stdout.write(
    `${JSON.stringify({
      email: parsedEmail.data,
      event: "membership.promotion",
      membership: "PREMIUM",
      occurredAt: new Date().toISOString(),
      source: "grant-premium-cli",
      status: "granted",
    })}\n`,
  )
}

void grantPremium()
  .catch(() => {
    process.stderr.write(
      `${JSON.stringify({ event: "membership.promotion", status: "failed" })}\n`,
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
