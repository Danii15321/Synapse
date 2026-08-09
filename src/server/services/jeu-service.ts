import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import {
  jeuCardSchema,
  type JeuCatalogPage,
  type JeuFull,
  jeuFullSchema,
  type JeuListQuery,
  type JeuTeaser,
  jeuTeaserSchema,
} from "@/lib/validators/jeu"
import { canAccess } from "@/server/access/entitlement"
import { ContentNotFoundError } from "@/server/errors"
import {
  findBySlug,
  findMany,
  findMetaBySlug,
} from "@/server/repositories/jeu-repository"

/**
 * Spécification : retourne une page bornée de jeux publiés. Les cartes ne
 * chargent ni l'extrait détaillé ni les règles, quel que soit l'acteur.
 */
export async function getJeux(query: JeuListQuery): Promise<JeuCatalogPage> {
  const rows = await findMany({ ...query, take: query.take + 1 })
  const hasNextPage = rows.length > query.take
  const items = rows.slice(0, query.take).map((row) =>
    jeuCardSchema.parse({
      ...row,
      closesAt: row.closesAt?.toISOString() ?? null,
      startsAt: row.startsAt?.toISOString() ?? null,
    }),
  )
  return {
    items,
    nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
  }
}

/**
 * Spécification : canAccess est l'unique décision d'entitlement. Pour un
 * anonyme ou un membre FREE face au PREMIUM, le repository ne sélectionne
 * jamais body ; les règles ne transitent donc ni en mémoire ni dans le DTO.
 */
export async function getJeuBySlug(
  slug: string,
  user: SessionUser | null,
): Promise<JeuTeaser | JeuFull> {
  const meta = await findMetaBySlug(slug)
  if (!meta) throw new ContentNotFoundError("jeu", slug)

  const entitled = canAccess(user, meta)
  const row = await findBySlug(slug, { includeBody: entitled })
  if (!row) throw new ContentNotFoundError("jeu", slug)

  const serialized = {
    ...row,
    closesAt: row.closesAt?.toISOString() ?? null,
    startsAt: row.startsAt?.toISOString() ?? null,
  }
  return "body" in row
    ? jeuFullSchema.parse(serialized)
    : jeuTeaserSchema.parse(serialized)
}
