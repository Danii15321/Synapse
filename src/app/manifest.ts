import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#FBF8F3",
    description:
      "Contenus Synapse en intelligence artificielle et entrepreneuriat.",
    icons: [
      { sizes: "512x512", src: "/icon.png", type: "image/png" },
      { sizes: "180x180", src: "/apple-icon.png", type: "image/png" },
    ],
    lang: "fr",
    name: "Synapse — Plateforme de contenu",
    short_name: "Synapse",
    start_url: "/",
    theme_color: "#07183D",
  }
}
