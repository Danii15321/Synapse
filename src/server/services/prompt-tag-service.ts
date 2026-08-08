import "server-only"

import { z } from "zod"

import { findPublishedTags } from "@/server/repositories/prompt-repository"

const publishedTagsSchema = z.array(z.string().trim().min(1).max(80)).max(500)

/**
 * Retourne les tags du catalogue publie pour alimenter le filtre global. La
 * requete distincte reste bornee et ne charge jamais les corps editoriaux.
 */
export async function getPublishedPromptTags(): Promise<string[]> {
  return publishedTagsSchema.parse(await findPublishedTags())
}
