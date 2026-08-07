import "server-only"

import type { PromptDto } from "@/lib/validators/prompt"
import { findMany } from "@/server/repositories/prompt-repository"

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
