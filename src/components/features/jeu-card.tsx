import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { JeuCardDto } from "@/lib/validators/jeu"

const JEU_FALLBACK_IMAGE = "/brand/opengraph-synapse.webp"

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

export function JeuCard({
  closesAt,
  coverImage,
  location,
  slug,
  startsAt,
  summary,
  title,
  visibility,
}: JeuCardDto) {
  return (
    <article className="prompt-card">
      <Link
        aria-label={title}
        className="prompt-card-link"
        href={`/jeux/${slug}`}
      >
        <CspImage
          alt={`Visuel du concours ${title}`}
          className="prompt-card-image card-image"
          height={600}
          src={coverImage ?? JEU_FALLBACK_IMAGE}
          width={800}
        />
        <span className="prompt-card-body">
          <span className="prompt-card-meta">
            <span className="tag">Jeu &amp; concours</span>
            {visibility === "PREMIUM" ? <PremiumBadge iconOnly /> : null}
          </span>
          <h2 className="card-heading">{title}</h2>
          <span className="card-copy">{summary}</span>
          {startsAt ? (
            <span className="card-copy">{formatDate(startsAt)}</span>
          ) : null}
          {location ? <span className="card-copy">{location}</span> : null}
          {closesAt ? (
            <span className="card-copy">
              Participations jusqu&apos;au {formatClosingDate(closesAt)}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}
