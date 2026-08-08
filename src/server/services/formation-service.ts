import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import {
  formationCardSchema,
  type FormationCatalogPage,
  type FormationFull,
  formationFullSchema,
  type FormationListQuery,
  type FormationTeaser,
  formationTeaserSchema,
} from "@/lib/validators/formation"
import { canAccess } from "@/server/access/entitlement"
import { ContentNotFoundError } from "@/server/errors"
import {
  findBySlug,
  findMany,
  findMetaBySlug,
} from "@/server/repositories/formation-repository"

/**
 * Spécification : retourne uniquement les cartes publiées et encore
 * consultables. Les permanentes n'expirent jamais ; une événementielle passée
 * est filtrée par le repository. Aucun champ de programme n'est chargé.
 */
export async function getFormations(
  query: FormationListQuery,
): Promise<FormationCatalogPage> {
  const rows = await findMany({ ...query, take: query.take + 1 })
  const hasNextPage = rows.length > query.take
  const items = rows.slice(0, query.take).map((row) =>
    formationCardSchema.parse({
      ...row,
      startsAt: row.startsAt?.toISOString() ?? null,
    }),
  )

  return {
    items,
    nextCursor: hasNextPage ? (items.at(-1)?.id ?? null) : null,
  }
}

/**
 * Spécification : FREE/PREMIUM est indépendant de PERMANENTE/
 * EVENEMENTIELLE. canAccess est l'unique décision d'accès et le repository ne
 * sélectionne body qu'après une réponse positive. Aucune inscription n'est
 * créée ni retournée dans cette tranche.
 */
export async function getFormationBySlug(
  slug: string,
  user: SessionUser | null,
): Promise<FormationTeaser | FormationFull> {
  const meta = await findMetaBySlug(slug)
  if (!meta) throw new ContentNotFoundError("formation", slug)

  const entitled = canAccess(user, meta)
  const row = await findBySlug(slug, { includeBody: entitled })
  if (!row) throw new ContentNotFoundError("formation", slug)

  const serialized = {
    ...row,
    startsAt:
      row.startsAt instanceof Date ? row.startsAt.toISOString() : row.startsAt,
  }
  return "body" in row
    ? formationFullSchema.parse(serialized)
    : formationTeaserSchema.parse(serialized)
}
