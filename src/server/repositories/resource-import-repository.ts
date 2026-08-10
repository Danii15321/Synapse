import "server-only"

import type { PrismaClient } from "@prisma/client"

import type { PromptImportRow } from "@/lib/validators/resource-import"

type SynchronizationResult = Readonly<{
  imported: number
  updated: number
}>

export async function synchronizePromptCatalogWithClient(
  client: PrismaClient,
  prompts: readonly PromptImportRow[],
): Promise<SynchronizationResult> {
  return client.$transaction(async (transaction) => {
    const slugs = prompts.map(({ slug }) => slug)
    const existing =
      slugs.length === 0
        ? []
        : await transaction.prompt.findMany({
            select: { slug: true },
            take: slugs.length,
            where: { slug: { in: slugs } },
          })

    await transaction.inscription.deleteMany()
    await transaction.formationInscription.deleteMany()
    await transaction.formation.deleteMany()
    await transaction.opportunite.deleteMany()
    await transaction.jeu.deleteMany()
    await transaction.prompt.deleteMany({
      where: slugs.length === 0 ? undefined : { slug: { notIn: slugs } },
    })

    for (const prompt of prompts) {
      await transaction.prompt.upsert({
        create: prompt,
        select: { id: true },
        update: prompt,
        where: { slug: prompt.slug },
      })
    }

    return {
      imported: prompts.length - existing.length,
      updated: existing.length,
    }
  })
}

export async function synchronizePromptCatalog(
  prompts: readonly PromptImportRow[],
): Promise<SynchronizationResult> {
  const { db } = await import("@/server/db")
  return synchronizePromptCatalogWithClient(db, prompts)
}
