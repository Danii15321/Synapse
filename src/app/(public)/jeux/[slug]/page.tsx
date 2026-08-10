import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DetailCoverImage } from "@/components/features/detail-cover-image"
import ParticipationControl from "@/components/features/participation-control"
import { PremiumGate } from "@/components/features/premium-gate"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { SessionUser } from "@/lib/validators/auth"
import { jeuSlugParamsSchema } from "@/lib/validators/jeu"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getParticipationState } from "@/server/services/inscription-service"
import { getJeuBySlug } from "@/server/services/jeu-service"

export const dynamic = "force-dynamic"

async function loadJeu(slug: string, user: SessionUser | null) {
  try {
    return await getJeuBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) notFound()
    throw error
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatClosingDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>): Promise<Metadata> {
  const parsed = jeuSlugParamsSchema.safeParse(await params)
  if (!parsed.success) return { title: "Concours introuvable" }
  const session = await auth()
  const jeu = await loadJeu(parsed.data.slug, session?.user ?? null)
  return { description: jeu.summary, title: jeu.title }
}

export default async function JeuDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsed = jeuSlugParamsSchema.safeParse(await params)
  if (!parsed.success) notFound()
  const session = await auth()
  const user = session?.user ?? null
  const jeu = await loadJeu(parsed.data.slug, user)
  const participationState = user
    ? await getParticipationState("JEU", jeu.slug, user)
    : null

  return (
    <main className="page-shell">
      <article className="content-reading">
        <DetailCoverImage
          alt={`Visuel du concours ${jeu.title}`}
          coverImage={jeu.coverImage}
          fallback="jeux"
        />
        <div className="tag-list detail-section">
          <span className="tag">Jeu &amp; concours</span>
          {jeu.visibility === "PREMIUM" ? (
            <PremiumBadge />
          ) : (
            <span className="tag">Libre</span>
          )}
        </div>
        <h1 className="page-heading detail-section">{jeu.title}</h1>
        <p className="detail-summary">{jeu.summary}</p>
        {jeu.startsAt ? (
          <p className="detail-copy">Date : {formatDate(jeu.startsAt)}</p>
        ) : null}
        {jeu.location ? (
          <p className="detail-copy">Lieu : {jeu.location}</p>
        ) : null}
        {jeu.closesAt ? (
          <p className="detail-copy">
            Participations ouvertes jusqu&apos;au{" "}
            {formatClosingDate(jeu.closesAt)}
          </p>
        ) : null}
        <p className="detail-copy">
          L&apos;activité se déroule hors plateforme. Synapse enregistre
          uniquement votre participation.
        </p>

        {jeu.excerpt ? (
          <section className="detail-section ui-card">
            <h2 className="card-heading">À propos du défi</h2>
            <p className="detail-copy">{jeu.excerpt}</p>
          </section>
        ) : null}

        {"body" in jeu ? (
          <section className="detail-section prompt-content-box">
            <h2 className="card-heading">Règles complètes</h2>
            <p className="detail-copy">{jeu.body}</p>
          </section>
        ) : (
          <PremiumGate />
        )}

        {user && participationState ? (
          <ParticipationControl
            activityType="JEU"
            initialState={participationState}
            location={jeu.location}
            slug={jeu.slug}
            startsAt={jeu.startsAt}
          />
        ) : (
          <section className="detail-section participation-panel ui-card">
            <h2 className="card-heading">Participation</h2>
            <Link
              className="ui-button participation-login-link"
              href={`/login?callbackUrl=${encodeURIComponent(`/jeux/${jeu.slug}`)}`}
            >
              Se connecter pour participer
            </Link>
          </section>
        )}
      </article>
    </main>
  )
}
