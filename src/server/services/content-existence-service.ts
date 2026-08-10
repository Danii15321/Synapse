import "server-only"

import type { ContentDetailPath } from "@/lib/validators/content-detail-path"
import { findMetaBySlug as findFormationMeta } from "@/server/repositories/formation-repository"
import { findMetaBySlug as findJeuMeta } from "@/server/repositories/jeu-repository"
import { findMetaBySlug as findOpportuniteMeta } from "@/server/repositories/opportunite-repository"
import { findMetaBySlug as findPromptMeta } from "@/server/repositories/prompt-repository"

/**
 * Spécification : vérifie uniquement l'existence publique d'un détail avant
 * que Next.js commence à diffuser sa réponse. Aucun champ verrouillé n'est lu.
 */
export async function publishedContentExists({
  rubric,
  slug,
}: ContentDetailPath): Promise<boolean> {
  switch (rubric) {
    case "formations":
      return Boolean(await findFormationMeta(slug))
    case "jeux":
      return Boolean(await findJeuMeta(slug))
    case "opportunites":
      return Boolean(await findOpportuniteMeta(slug))
    case "prompts":
      return Boolean(await findPromptMeta(slug))
  }
}
