import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { FormationCardDto } from "@/lib/validators/formation"

const FORMATION_FALLBACK_IMAGE = "/images/fallbacks/fallback-formations.webp"

type FormationCardProps = Omit<FormationCardDto, "startsAt"> &
  Readonly<{ startsAt: Date | string | null }>

const KIND_LABELS = {
  EVENEMENTIELLE: "Événementielle",
  PERMANENTE: "Permanente",
} as const

const LEVEL_LABELS = {
  AVANCE: "Avancé",
  DEBUTANT: "Débutant",
  INTERMEDIAIRE: "Intermédiaire",
} as const

const FORMAT_LABELS = {
  EN_LIGNE: "En ligne",
  HYBRIDE: "Hybride",
  PRESENTIEL: "Présentiel",
} as const

function formatSessionDate(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

export function FormationCard({
  coverImage,
  durationH,
  format,
  kind,
  level,
  slug,
  startsAt,
  summary,
  title,
  visibility,
}: FormationCardProps) {
  return (
    <article className="prompt-card">
      <Link
        aria-label={title}
        className="prompt-card-link"
        href={`/formations/${slug}`}
      >
        <CspImage
          alt={`Illustration de la formation ${title}`}
          className="prompt-card-image"
          height={600}
          src={coverImage ?? FORMATION_FALLBACK_IMAGE}
          width={800}
        />
        <span className="prompt-card-body">
          <span className="prompt-card-meta">
            <span className="tag">{KIND_LABELS[kind]}</span>
            <span className="tag">{LEVEL_LABELS[level]}</span>
            <span className="tag">{FORMAT_LABELS[format]}</span>
            {visibility === "PREMIUM" ? <PremiumBadge /> : null}
          </span>
          <h2 className="card-heading">{title}</h2>
          <span className="card-copy">{summary}</span>
          {kind === "EVENEMENTIELLE" && startsAt ? (
            <span className="card-copy">{formatSessionDate(startsAt)}</span>
          ) : null}
          {durationH ? (
            <span className="card-copy">Durée : {durationH} h</span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}

export { FORMAT_LABELS, KIND_LABELS, LEVEL_LABELS }

