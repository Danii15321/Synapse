import { CspImage } from "@/components/ui/csp-image"

type DetailCoverImageProps = Readonly<{
  alt: string
  coverImage: string | null
  fallback: "formations" | "jeux" | "opportunites" | "prompts"
}>

export function DetailCoverImage({
  alt,
  coverImage,
  fallback,
}: DetailCoverImageProps) {
  if (!coverImage) {
    return (
      <div
        className={`prompt-detail-image detail-cover-fallback detail-cover-fallback-${fallback}`}
      />
    )
  }

  return (
    <CspImage
      alt={alt}
      className="prompt-detail-image"
      height={900}
      priority
      sizes="(min-width: 768px) 768px, calc(100vw - 32px)"
      src={coverImage}
      width={1200}
    />
  )
}
