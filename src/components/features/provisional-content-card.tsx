import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"

type ProvisionalContentCardProps = Readonly<{
  href: string
  rubric: string
  summary: string
  title: string
}>

/** Carte provisoire de l'accueil, remplacée par le patron de la tranche 07. */
export function ProvisionalContentCard({
  href,
  rubric,
  summary,
  title,
}: ProvisionalContentCardProps) {
  return (
    <article className="provisional-card">
      <Link aria-label={`Ouvrir ${title} — rubrique ${rubric}`} href={href}>
        <CspImage
          alt=""
          className="provisional-visual"
          height={720}
          src="/images/fallbacks/fallback-prompts.webp"
          width={960}
        />
        <div className="provisional-body">
          <p className="eyebrow">{rubric}</p>
          <h3 className="provisional-title">{title}</h3>
          <p className="provisional-summary">{summary}</p>
        </div>
      </Link>
    </article>
  )
}
