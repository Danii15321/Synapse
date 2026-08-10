import { CspImage } from "@/components/ui/csp-image"

type DetailCoverImageProps = Readonly<{
  alt: string
  coverImage: string | null
  fallback: "formations" | "jeux" | "opportunites" | "prompts"
}>

const FALLBACK_ALT: Record<DetailCoverImageProps["fallback"], string> = {
  formations: "Illustration par défaut des formations Synapse",
  jeux: "Illustration par défaut des jeux et concours Synapse",
  opportunites: "Illustration par défaut des opportunités Synapse",
  prompts: "Illustration par défaut des prompts Synapse",
}

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='900' viewBox='0 0 1200 900'%3E%3Cpath fill='%2307183d' d='M0 0h1200v900H0z'/%3E%3Ccircle cx='600' cy='450' r='190' fill='%23f4b942'/%3E%3Cpath fill='%23fbf8f3' d='M505 355h190v190H505z'/%3E%3C/svg%3E"

export function DetailCoverImage({
  alt,
  coverImage,
  fallback,
}: DetailCoverImageProps) {
  return (
    <CspImage
      alt={coverImage ? alt : FALLBACK_ALT[fallback]}
      className="prompt-detail-image"
      height={900}
      priority
      sizes="(min-width: 768px) 768px, calc(100vw - 32px)"
      src={coverImage ?? FALLBACK_IMAGE}
      unoptimized={!coverImage}
      width={1200}
    />
  )
}
