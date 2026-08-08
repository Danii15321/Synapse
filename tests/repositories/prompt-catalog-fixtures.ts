import { randomUUID } from "node:crypto"

import { Prisma } from "@prisma/client"
import { vi } from "vitest"

import { db } from "@/server/db"

export type PromptDomain =
  "ia" | "entrepreneuriat" | "productivite" | "communication"

export type ListOptions = Readonly<{
  cursor?: string
  domain?: PromptDomain
  search?: string
  tag?: string
  take: number
}>

export type PromptRepositoryModule = Readonly<{
  findBySlug: (
    slug: string,
    options: Readonly<{ includeBody: boolean }>,
  ) => Promise<unknown>
  findMany: (options: ListOptions) => Promise<unknown>
  findMetaBySlug: (slug: string) => Promise<unknown>
}>

const fixturePrefixes = new Set<string>()

export function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isRepositoryModule(value: unknown): value is PromptRepositoryModule {
  return (
    isRecord(value) &&
    typeof value.findBySlug === "function" &&
    typeof value.findMany === "function" &&
    typeof value.findMetaBySlug === "function"
  )
}

export function rowsOf(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error("findMany doit retourner un tableau de rows")
  }
  return value
}

export async function loadRepository(): Promise<PromptRepositoryModule> {
  const module: unknown =
    await import("@/server/repositories/prompt-repository")
  if (!isRepositoryModule(module)) {
    throw new Error(
      "prompt-repository doit exporter findMany, findMetaBySlug et findBySlug",
    )
  }
  return module
}

export function newPrefix(label: string): string {
  const prefix = `t07-${label}-${randomUUID()}`
  fixturePrefixes.add(prefix)
  return prefix
}

export async function insertPrompt(
  prefix: string,
  values: Readonly<{
    body?: string
    domain?: PromptDomain
    published?: boolean
    summary?: string
    tags?: string[]
    title?: string
    visibility?: "FREE" | "PREMIUM"
  }> = {},
): Promise<string> {
  const id = `${prefix}-id`
  const slug = `${prefix}-slug`
  const publishedAt = values.published === false ? null : new Date()
  const domain = values.domain ?? "ia"
  const domainLiteral = {
    communication: Prisma.sql`'communication'`,
    entrepreneuriat: Prisma.sql`'entrepreneuriat'`,
    ia: Prisma.sql`'ia'`,
    productivite: Prisma.sql`'productivite'`,
  }[domain]
  const visibility: string = values.visibility ?? "FREE"
  await db.$executeRaw`
    INSERT INTO "Prompt" (
      "id", "slug", "title", "summary", "excerpt", "body", "domain",
      "tags", "coverImage", "visibility", "publishedAt", "createdAt",
      "updatedAt"
    )
    VALUES (
      ${id}, ${slug}, ${values.title ?? "Prompt de test"},
      ${values.summary ?? "Résumé de test"}, 'Extrait public',
      ${values.body ?? `CORPS-${prefix}`}, ${domainLiteral},
      ${values.tags ?? [prefix]}::text[], NULL,
      ${visibility}::"Visibility", ${publishedAt}, NOW(), NOW()
    )
  `
  return id
}

export async function insertLargeDataset(
  prefix: string,
  count = 205,
): Promise<void> {
  await db.$executeRaw`
    INSERT INTO "Prompt" (
      "id", "slug", "title", "summary", "excerpt", "body", "domain",
      "tags", "coverImage", "visibility", "publishedAt", "createdAt",
      "updatedAt"
    )
    SELECT
      ${prefix} || '-id-' || LPAD(series::text, 3, '0'),
      ${prefix} || '-slug-' || LPAD(series::text, 3, '0'),
      'Prompt ' || series, 'Résumé ' || series, 'Extrait ' || series,
      'Corps ' || series, 'ia', ARRAY[${prefix}]::text[],
      NULL, 'FREE'::"Visibility",
      NOW() - (series || ' seconds')::interval, NOW(), NOW()
    FROM generate_series(1, ${count}) AS series
  `
}

export async function cleanupPromptFixtures(): Promise<void> {
  vi.doUnmock("@/server/db")
  vi.resetModules()
  for (const prefix of fixturePrefixes) {
    await db.$executeRaw`DELETE FROM "Prompt" WHERE "id" LIKE ${`${prefix}%`}`
  }
  fixturePrefixes.clear()
}
