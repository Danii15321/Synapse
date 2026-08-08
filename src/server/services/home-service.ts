import "server-only"

import { getHomeOverview } from "@/server/repositories/home-repository"

/**
 * Spécification : construit l'accueil depuis des compteurs réels et les trois
 * prompts les plus récents. Les cartes récentes ne transportent que leurs
 * métadonnées publiques ; aucun corps premium n'est lu ni retourné.
 */
export async function getHomePageData() {
  const overview = await getHomeOverview()

  return {
    recent: overview.recentPrompts.map((prompt) => {
      const cardMetadata = Object.prototype.hasOwnProperty.call(
        prompt,
        "coverImage",
      )
        ? {
            coverImage: prompt.coverImage,
            domain: prompt.domain,
            slug: prompt.slug,
            tags: prompt.tags,
            visibility: prompt.visibility,
          }
        : {}

      return {
        href: `/prompts/${prompt.slug}`,
        id: prompt.id,
        rubric: "Prompts",
        summary: prompt.summary,
        title: prompt.title,
        ...cardMetadata,
      }
    }),
    sections: [
      {
        count: overview.counts.prompts,
        href: "/prompts",
        key: "prompts",
        title: "Prompts",
      },
      {
        count: overview.counts.formations,
        href: "/formations",
        key: "formations",
        title: "Formations",
      },
      {
        count: overview.counts.jeux,
        href: "/jeux",
        key: "jeux",
        title: "Jeux & concours",
      },
      {
        count: overview.counts.opportunites,
        href: "/opportunites",
        key: "opportunites",
        title: "Bons plans & opportunités",
      },
    ],
  }
}
