import "server-only"

import { PrismaClient } from "@prisma/client"

import { config } from "@/server/config"

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  prismaGlobal.prisma ??
  new PrismaClient({
    datasourceUrl: config.DATABASE_URL,
  })

if (config.NODE_ENV !== "production") {
  prismaGlobal.prisma = db
}
