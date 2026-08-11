import { randomUUID } from "node:crypto"

import { PrismaClient } from "@prisma/client"
import type { Page } from "@playwright/test"

import { completeRegistration } from "./auth-profile-helpers"

export const premiumTunnelDb = new PrismaClient()
const emails = new Set<string>()

export type MembershipGrantSnapshot = Readonly<{
  createdAt: Date
  id: string
  source: string
  updatedAt: Date
  userId: string
}>

export async function membershipGrantSnapshot(): Promise<
  MembershipGrantSnapshot[]
> {
  return premiumTunnelDb.$queryRaw<MembershipGrantSnapshot[]>`
    SELECT "id", "userId", "source", "createdAt", "updatedAt"
    FROM "MembershipGrant"
    ORDER BY "id"
  `
}

export async function registerFreePremiumMember(page: Page): Promise<string> {
  await premiumTunnelDb.rateLimit.deleteMany({
    where: {
      identifier: "sensitive:auth-callback:ip:untrusted-client",
    },
  })
  const email = `t10-premium-${randomUUID()}@example.test`
  emails.add(email)
  await page.goto("/register")
  await completeRegistration(page, {
    email,
    password: "MotDePasse!2026",
  })
  await page.waitForURL(/\/compte$/u)
  return email
}

export async function cleanupPremiumTunnelMembers(): Promise<void> {
  for (const email of emails) {
    const user = await premiumTunnelDb.user.findUnique({
      select: { id: true },
      where: { email },
    })
    if (user) {
      const tables = await premiumTunnelDb.$queryRaw<
        Array<{ tableName: string }>
      >`
        SELECT table_name AS "tableName"
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'MembershipGrant'
      `
      if (tables.length > 0) {
        await premiumTunnelDb.$executeRaw`
          DELETE FROM "MembershipGrant" WHERE "userId" = ${user.id}
        `
      }
    }
    await premiumTunnelDb.user.deleteMany({ where: { email } })
  }
  emails.clear()
}
