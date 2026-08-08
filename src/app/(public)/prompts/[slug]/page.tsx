import { notFound } from "next/navigation"

import { PremiumGate } from "@/components/features/premium-gate"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { promptSlugParamsSchema } from "@/lib/validators/prompt"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getPromptBySlug } from "@/server/services/prompt-service"

export const dynamic = "force-dynamic"

const VISIBILITY_BADGE = {
  FREE: <span className="tag">Libre</span>,
  PREMIUM: <PremiumBadge />,
} as const

async function loadPrompt(slug: string, user: SessionUser | null) {
  try {
    return await getPromptBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      notFound()
    }

    throw error
  }
}

export default async function PromptDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsedParams = promptSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) {
    notFound()
  }

  const session = await auth()
  const prompt = await loadPrompt(parsedParams.data.slug, session?.user ?? null)

  return (
    <main className="page-shell">
      <article className="content-reading">
        <div className="tag-list">
          {VISIBILITY_BADGE[prompt.visibility]}
          {prompt.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <h1 className="page-heading detail-section">{prompt.title}</h1>
        <p className="detail-summary">{prompt.summary}</p>

        <section className="detail-section ui-card">
          <h2 className="card-heading">Ce que vous allez obtenir</h2>
          <p className="detail-copy">{prompt.excerpt}</p>
        </section>

        {"body" in prompt ? (
          <section className="detail-section ui-card">
            <h2 className="card-heading">Le prompt complet</h2>
            <p className="detail-copy">{prompt.body}</p>
          </section>
        ) : (
          <PremiumGate />
        )}
      </article>
    </main>
  )
}
