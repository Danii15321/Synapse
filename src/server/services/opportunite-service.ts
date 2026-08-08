import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import {
  opportuniteCardSchema,
  type OpportuniteCatalogPage,
  type OpportuniteFull,
  opportuniteFullSchema,
  type OpportuniteListQuery,
  type OpportuniteTeaser,
  opportuniteTeaserSchema,
} from "@/lib/validators/opportunite"
import { canAccess } from "@/server/access/entitlement"
import { ContentNotFoundError } from "@/server/errors"
import {
  findBySlug,
  findMany,
  findMetaBySlug,
} from "@/server/repositories/opportunite-repository"

/**
 * Spécification : retourne les cartes publiées dont la date limite n'est pas
 * passée. La péremption est appliquée dans le repository et aucune archive
 * d'opportunités n'est exposée en v1.
 */
export async function getOpportunites(
  query: OpportuniteListQuery,
): Promise<OpportuniteCatalogPage> {
  const rows = await findMany({ ...query, take: query.take + 1 })
  const hasNextPage = rows.length > query.take
  const items = rows.slice(0, query.take).map((row) =>
    opportuniteCardSchema.parse({
      ...row,
      deadline: row.deadline?.toISOString() ?? null,
    }),
  )

  return {
    items,
    nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
  }
}

/**
 * Spécification : body et externalUrl sont verrouillés ensemble. L'anonyme et
 * le membre FREE ne les chargent jamais ; seul canAccess autorise leur select
 * pour un contenu FREE ou un membre PREMIUM.
 */
export async function getOpportuniteBySlug(
  slug: string,
  user: SessionUser | null,
): Promise<OpportuniteTeaser | OpportuniteFull> {
  const meta = await findMetaBySlug(slug)
  if (!meta) throw new ContentNotFoundError("opportunite", slug)

  const entitled = canAccess(user, meta)
  const row = await findBySlug(slug, { includeLockedFields: entitled })
  if (!row) throw new ContentNotFoundError("opportunite", slug)

  const serialized = {
    ...row,
    deadline:
      row.deadline instanceof Date ? row.deadline.toISOString() : row.deadline,
  }
  return "body" in row && "externalUrl" in row
    ? opportuniteFullSchema.parse(serialized)
    : opportuniteTeaserSchema.parse(serialized)
}
