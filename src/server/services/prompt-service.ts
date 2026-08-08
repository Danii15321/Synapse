import "server-only"

import {
  promptCardSchema,
  promptFullSchema,
  promptTeaserSchema,
  type PromptCatalogPage,
  type PromptFull,
  type PromptListQuery,
  type PromptTeaser,
} from "@/lib/validators/prompt"
import { canAccess } from "@/server/access/entitlement"
import { ContentNotFoundError } from "@/server/errors"
import {
  findBySlug,
  findMany,
  findMetaBySlug,
} from "@/server/repositories/prompt-repository"
import type { SessionUser } from "@/lib/validators/auth"

/**
 * Spécification : construit un catalogue paginé à partir de filtres validés.
 * Chaque carte contient uniquement les métadonnées publiques d'un prompt
 * publié ; le corps verrouillé n'est jamais sélectionné.
 */
export async function getPrompts(
  query: PromptListQuery,
): Promise<PromptCatalogPage> {
  const rows = await findMany({
    ...query,
    take: query.take + 1,
  })
  const hasNextPage = rows.length > query.take
  const items = rows
    .slice(0, query.take)
    .map((row) => promptCardSchema.parse(row))

  return {
    items,
    nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
  }
}

/**
 * Spécification : un prompt libre est intégralement accessible. Pour un prompt
 * premium, seuls les membres PREMIUM reçoivent le corps. Les anonymes et les
 * membres FREE reçoivent le teaser éditorial, sans que body soit lu en base.
 * Un slug absent lève une erreur domaine avant la lecture conditionnelle.
 */
export async function getPromptBySlug(
  slug: string,
  user: SessionUser | null,
): Promise<PromptTeaser | PromptFull> {
  const meta = await findMetaBySlug(slug)
  if (!meta) {
    throw new ContentNotFoundError("prompt", slug)
  }

  const entitled = canAccess(user, meta)
  const row = await findBySlug(slug, {
    includeBody: entitled,
  })
  if (!row) {
    throw new ContentNotFoundError("prompt", slug)
  }

  return entitled ? promptFullSchema.parse(row) : promptTeaserSchema.parse(row)
}
