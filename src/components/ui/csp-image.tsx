import { getImageProps, type ImageProps } from "next/image"

/**
 * Conserve l'optimisation d'images de Next sans son style inline par défaut.
 * Les attributs style sont interdits par la CSP stricte de Synapse.
 */
export function CspImage(props: ImageProps) {
  const { style: inlineStyle, ...safeProps } = getImageProps(props).props
  void inlineStyle

  return (
    // Next fournit ici src, srcSet, dimensions et stratégie de chargement.
    // eslint-disable-next-line @next/next/no-img-element
    <img {...safeProps} alt={props.alt} />
  )
}
