import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PromptActions } from "@/components/features/prompt-actions"
import { PromptBody } from "@/components/features/prompt-body"
import { PremiumGate } from "@/components/features/premium-gate"
import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { promptSlugParamsSchema } from "@/lib/validators/prompt"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getPromptBySlug } from "@/server/services/prompt-service"

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

  return (
    <main className="page-shell">
      <article className="content-reading">
        <CspImage
          alt=""
          className="prompt-detail-image"
          height={900}
          priority
          src={prompt.coverImage ?? PROMPT_FALLBACK_IMAGE}
          width={1200}
        />
        <div className="tag-list detail-section">
          {prompt.domain && !prompt.tags.includes(prompt.domain) ? (
            <span className="tag">{prompt.domain}</span>
          ) : null}
          {prompt.visibility === "PREMIUM" ? (
            <PremiumBadge />
          ) : (
            <span className="tag">Libre</span>
          )}
          {prompt.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <h1 className="page-heading detail-section">{prompt.title}</h1>
        <p className="detail-summary">{prompt.summary}</p>

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
              <PromptActions body={prompt.body} />
            </div>
            <PromptBody body={prompt.body} />
          </section>
        ) : (
          <PremiumGate />
        )}
      </article>
    </main>
  )
}
