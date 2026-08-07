import type { PromptDto } from "@/lib/validators/prompt"
import { promptListSchema } from "@/lib/validators/prompt"

export async function getPrompts(): Promise<PromptDto[]> {
  const response = await fetch("/api/prompts")

  if (!response.ok) {
    throw new Error("Impossible de charger les prompts.")
  }

  const payload: unknown = await response.json()

  return promptListSchema.parse(payload)
}
