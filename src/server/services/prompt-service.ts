import "server-only"

import {
  promptFullSchema,
  promptTeaserSchema,
  type PromptDto,
  type PromptFull,
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
 * Spécification : retourne les prompts publics dans l'ordre du repository et
 * une liste vide lorsque la base est vide. Cette tranche ne porte aucun champ
 * premium : aucune règle d'entitlement ne s'applique encore.
 */
export async function getPrompts(): Promise<PromptDto[]> {
  const rows = await findMany()

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
  }))
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
  const row = await findBySlug(slug, { includeBody: entitled })
  if (!row) {
    throw new ContentNotFoundError("prompt", slug)
  }

  return entitled ? promptFullSchema.parse(row) : promptTeaserSchema.parse(row)
}
