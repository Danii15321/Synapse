import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { PromptCardDto } from "@/lib/validators/prompt"

const PROMPT_FALLBACK_IMAGE = "/images/fallbacks/fallback-prompts.webp"

export function PromptCard({
  coverImage,
  slug,
  summary,
  title,
  visibility,
}: PromptCardDto) {
  return (
    <article className="prompt-card">
      <Link
        aria-label={title}
        className="prompt-card-link"
        href={`/prompts/${slug}`}
      >
        <span className="prompt-card-visual">
          <CspImage
            alt={`Illustration du prompt ${title}`}
            className={`prompt-card-image${visibility === "PREMIUM" ? " prompt-card-image-premium" : ""}`}
            height={600}
            priority={!coverImage}
            src={coverImage ?? PROMPT_FALLBACK_IMAGE}
            width={800}
          />
          {visibility === "PREMIUM" ? (
            <PremiumBadge className="prompt-card-premium-badge" />
          ) : null}
        </span>
        <span className="prompt-card-body">
          <h2 className="card-heading">{title}</h2>
          <span className="card-copy">{summary}</span>
        </span>
      </Link>
    </article>
  )
}
