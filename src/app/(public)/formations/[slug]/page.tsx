import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import ParticipationControl from "@/components/features/participation-control"
import {
  FORMAT_LABELS,
  KIND_LABELS,
  LEVEL_LABELS,
} from "@/components/features/formation-card"
import { PremiumGate } from "@/components/features/premium-gate"
import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { formationSlugParamsSchema } from "@/lib/validators/formation"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getFormationBySlug } from "@/server/services/formation-service"
import { getParticipationState } from "@/server/services/inscription-service"

export const dynamic = "force-dynamic"

const FORMATION_FALLBACK_IMAGE = "/images/fallbacks/fallback-formations.webp"

async function loadFormation(slug: string, user: SessionUser | null) {
  try {
    return await getFormationBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) notFound()
    throw error
  }
}

function formatSessionDate(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const parsedParams = formationSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) return { title: "Formation introuvable" }
  const session = await auth()
  const formation = await loadFormation(
    parsedParams.data.slug,
    session?.user ?? null,
  )
  return { description: formation.summary, title: formation.title }
}

export default async function FormationDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsedParams = formationSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) notFound()
  const session = await auth()
  const formation = await loadFormation(
    parsedParams.data.slug,
    session?.user ?? null,
  )
  const user = session?.user ?? null
  const participationState =
    formation.kind === "EVENEMENTIELLE" && user
      ? await getParticipationState("FORMATION", formation.slug, user)
      : null

  return (
    <main className="page-shell">
      <article className="content-reading">
        <CspImage
          alt=""
          className="prompt-detail-image"
          height={900}
          priority
          src={formation.coverImage ?? FORMATION_FALLBACK_IMAGE}
          width={1200}
        />
        <div className="tag-list detail-section">
          <span className="tag">{KIND_LABELS[formation.kind]}</span>
          {formation.level ? (
            <span className="tag">{LEVEL_LABELS[formation.level]}</span>
          ) : null}
          {formation.format ? (
            <span className="tag">{FORMAT_LABELS[formation.format]}</span>
          ) : null}
          {formation.visibility === "PREMIUM" ? (
            <PremiumBadge />
          ) : (
            <span className="tag">Libre</span>
          )}
        </div>
        <h1 className="page-heading detail-section">{formation.title}</h1>
        <p className="detail-summary">{formation.summary}</p>
        {formation.kind === "EVENEMENTIELLE" && formation.startsAt ? (
          <p className="detail-copy">
            Session : {formatSessionDate(formation.startsAt)}
          </p>
        ) : null}
        {formation.durationH ? (
          <p className="detail-copy">Durée : {formation.durationH} h</p>
        ) : null}

        {formation.excerpt ? (
          <section className="detail-section ui-card">
            <h2 className="card-heading">Ce que vous allez apprendre</h2>
            <p className="detail-copy">{formation.excerpt}</p>
          </section>
        ) : null}

        {"body" in formation ? (
          <section className="detail-section prompt-content-box">
            <h2 className="card-heading">Programme de la formation</h2>
            <p className="detail-copy">{formation.body}</p>
          </section>
        ) : (
          <PremiumGate />
        )}

        {formation.kind === "EVENEMENTIELLE" && participationState ? (
          <ParticipationControl
            activityType="FORMATION"
            initialState={participationState}
            location={FORMAT_LABELS[formation.format]}
            slug={formation.slug}
            startsAt={formation.startsAt}
          />
        ) : null}
        {formation.kind === "EVENEMENTIELLE" && !user ? (
          <section className="detail-section participation-panel ui-card">
            <h2 className="card-heading">Participation</h2>
            <Link
              className="ui-button participation-login-link"
              href={`/login?callbackUrl=${encodeURIComponent(`/formations/${formation.slug}`)}`}
            >
              Se connecter pour participer
            </Link>
          </section>
        ) : null}
      </article>
    </main>
  )
}
