import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { TYPE_LABELS } from "@/components/features/opportunite-card"
import { PremiumGate } from "@/components/features/premium-gate"
import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { opportuniteSlugParamsSchema } from "@/lib/validators/opportunite"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getOpportuniteBySlug } from "@/server/services/opportunite-service"

export const dynamic = "force-dynamic"

const OPPORTUNITE_FALLBACK_IMAGE =
  "/images/fallbacks/fallback-opportunites.webp"

async function loadOpportunite(slug: string, user: SessionUser | null) {
  try {
    return await getOpportuniteBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) notFound()
    throw error
  }
}

function formatDeadline(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(value),
  )
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const parsedParams = opportuniteSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) return { title: "Opportunité introuvable" }
  const session = await auth()
  const opportunite = await loadOpportunite(
    parsedParams.data.slug,
    session?.user ?? null,
  )
  return { description: opportunite.summary, title: opportunite.title }
}

export default async function OpportuniteDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsedParams = opportuniteSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) notFound()
  const session = await auth()
  const opportunite = await loadOpportunite(
    parsedParams.data.slug,
    session?.user ?? null,
  )

  return (
    <main className="page-shell">
      <article className="content-reading">
        <CspImage
          alt=""
          className="prompt-detail-image"
          height={900}
          priority
          src={opportunite.coverImage ?? OPPORTUNITE_FALLBACK_IMAGE}
          width={1200}
        />
        <div className="tag-list detail-section">
          {opportunite.type ? (
            <span className="tag">{TYPE_LABELS[opportunite.type]}</span>
          ) : null}
          {opportunite.visibility === "PREMIUM" ? (
            <PremiumBadge />
          ) : (
            <span className="tag">Libre</span>
          )}
        </div>
        <h1 className="page-heading detail-section">{opportunite.title}</h1>
        <p className="detail-summary">{opportunite.summary}</p>
        <p className="detail-copy">{opportunite.organisme}</p>
        {opportunite.deadline ? (
          <p className="detail-copy">
            Date limite : {formatDeadline(opportunite.deadline)}
          </p>
        ) : null}

        {opportunite.excerpt ? (
          <section className="detail-section ui-card">
            <h2 className="card-heading">Pourquoi cette opportunité compte</h2>
            <p className="detail-copy">{opportunite.excerpt}</p>
          </section>
        ) : null}

        {"body" in opportunite ? (
          <section className="detail-section prompt-content-box">
            <h2 className="card-heading">Détails de l&apos;opportunité</h2>
            <p className="detail-copy">{opportunite.body}</p>
            {opportunite.externalUrl ? (
              <a
                className="pagination-link"
                href={opportunite.externalUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Candidater
              </a>
            ) : null}
          </section>
        ) : (
          <PremiumGate />
        )}
      </article>
    </main>
  )
}

