import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { OpportuniteCardDto } from "@/lib/validators/opportunite"

const OPPORTUNITE_FALLBACK_IMAGE =
  "/images/fallbacks/fallback-opportunites.webp"

type OpportuniteCardProps = Omit<OpportuniteCardDto, "deadline"> &
  Readonly<{ deadline: Date | string | null }>

const TYPE_LABELS = {
  APPEL_OFFRE: "Appel d'offre",
  COLLABORATION: "Collaboration",
  EMPLOI: "Emploi",
  FINANCEMENT: "Financement",
  STAGE: "Stage",
} as const

function formatDeadline(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
    new Date(value),
  )
}

export function OpportuniteCard({
  coverImage,
  deadline,
  organisme,
  slug,
  summary,
  title,
  type,
  visibility,
}: OpportuniteCardProps) {
  return (
    <article className="prompt-card">
      <Link
        aria-label={title}
        className="prompt-card-link"
        href={`/opportunites/${slug}`}
      >
        <CspImage
          alt={`Illustration de l'opportunité ${title}`}
          className="prompt-card-image"
          height={600}
          src={coverImage ?? OPPORTUNITE_FALLBACK_IMAGE}
          width={800}
        />
        <span className="prompt-card-body">
          <span className="prompt-card-meta">
            <span className="tag">{TYPE_LABELS[type]}</span>
            {visibility === "PREMIUM" ? <PremiumBadge /> : null}
          </span>
          <h2 className="card-heading">{title}</h2>
          <span className="card-copy">{summary}</span>
          <span className="card-copy">{organisme}</span>
          {deadline ? (
            <span className="card-copy">
              Date limite : {formatDeadline(deadline)}
            </span>
          ) : null}
        </span>
      </Link>
    </article>
  )
}

export { TYPE_LABELS }

