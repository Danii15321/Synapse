import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "Identité visuelle Synapse"
export const size = { height: 630, width: 1200 }
export const contentType = "image/webp"

/** Compatibilité avec la convention Next : sert l'actif statique sans rendu CSS. */
export default async function OpenGraphImage(): Promise<Response> {
  const image = await readFile(
    join(process.cwd(), "public", "brand", "opengraph-synapse.webp"),
  )

  return new Response(image, {
    headers: { "Content-Type": contentType },
  })
}
