import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DetailCoverImage } from "@/components/features/detail-cover-image"
import { PromptActions } from "@/components/features/prompt-actions"
import { PromptBody } from "@/components/features/prompt-body"
import { PromptCard } from "@/components/features/prompt-card"
import { PremiumGate } from "@/components/features/premium-gate"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { promptSlugParamsSchema } from "@/lib/validators/prompt"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import {
  getPromptBySlug,
  getRelatedPrompts,
} from "@/server/services/prompt-service"

export const dynamic = "force-dynamic"

const PROMPT_FALLBACK_IMAGE = "/images/fallbacks/fallback-prompts.webp"

async function loadPrompt(slug: string, user: SessionUser | null) {
  try {
    return await getPromptBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) notFound()
    throw error
  }
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const parsedParams = promptSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) return { title: "Prompt introuvable" }

  const session = await auth()
  const prompt = await loadPrompt(parsedParams.data.slug, session?.user ?? null)
  return {
    description: prompt.summary,
    openGraph: {
      description: prompt.summary,
      images: [
        {
          alt: prompt.title,
          height: 900,
          url: prompt.coverImage ?? PROMPT_FALLBACK_IMAGE,
          width: 1200,
        },
      ],
      title: prompt.title,
      type: "article",
    },
    title: prompt.title,
  }
}

export default async function PromptDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsedParams = promptSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) notFound()

  const session = await auth()
  const prompt = await loadPrompt(parsedParams.data.slug, session?.user ?? null)
  const relatedPrompts = await getRelatedPrompts({
    domain: prompt.domain,
    excludeId: prompt.id,
  })

  return (
    <main className="page-shell">
      <article className="content-reading">
        <div
          className={`prompt-detail-visual${prompt.visibility === "PREMIUM" ? " prompt-detail-visual-premium" : ""}`}
        >
          <DetailCoverImage
            alt={`Illustration du prompt ${prompt.title}`}
            coverImage={prompt.coverImage}
            fallback="prompts"
          />
          {prompt.visibility === "PREMIUM" ? (
            <PremiumBadge className="prompt-detail-premium-badge" />
          ) : null}
        </div>
        <h1 className="page-heading detail-section">{prompt.title}</h1>

        {prompt.excerpt ? (
          <section className="detail-section ui-card">
            <h2 className="card-heading">Ce que vous allez obtenir</h2>
            <p className="detail-copy">{prompt.excerpt}</p>
          </section>
        ) : null}

        {"body" in prompt ? (
          <section className="detail-section prompt-content-box">
            <div className="prompt-content-heading">
              <h2 className="card-heading">Le prompt complet</h2>
              <PromptActions
                allowClaudePrefill={prompt.visibility !== "PREMIUM"}
                body={prompt.body}
              />
            </div>
            <PromptBody body={prompt.body} />
          </section>
        ) : (
          <PremiumGate />
        )}
      </article>
      {relatedPrompts.length > 0 ? (
        <section className="content-wide detail-section">
          <h2 className="section-heading">Vous aimerez aussi</h2>
          <div className="recent-grid">
            {relatedPrompts.map((relatedPrompt) => (
              <PromptCard key={relatedPrompt.id} {...relatedPrompt} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
