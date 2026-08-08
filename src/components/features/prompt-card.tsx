import Link from "next/link"

import { CspImage } from "@/components/ui/csp-image"
import { PremiumBadge } from "@/components/ui/premium-badge"
import type { PromptCardDto } from "@/lib/validators/prompt"

const PROMPT_FALLBACK_IMAGE = "/images/fallbacks/fallback-prompts.webp"

export function PromptCard({
  coverImage,
  domain,
  slug,
  summary,
  tags,
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
        <CspImage
          alt={`Illustration du prompt ${title}`}
          className="prompt-card-image"
          height={600}
          src={coverImage ?? PROMPT_FALLBACK_IMAGE}
          width={800}
        />
        <span className="prompt-card-body">
          <span className="prompt-card-meta">
            <span className="tag">{domain}</span>
            {visibility === "PREMIUM" ? <PremiumBadge /> : null}
          </span>
          <h2 className="card-heading">{title}</h2>
          <span className="card-copy">{summary}</span>
          <span className="tag-list" aria-label="Tags">
            {tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </span>
        </span>
      </Link>
    </article>
  )
}
