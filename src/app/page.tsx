import Link from "next/link"
import { Suspense, type ReactNode } from "react"

import { PromptCard } from "@/components/features/prompt-card"
import type { PromptCardDto } from "@/lib/validators/prompt"
import { getHomePageData } from "@/server/services/home-service"

export const dynamic = "force-dynamic"

type HomeData = Awaited<ReturnType<typeof getHomePageData>>

function isPromptCardContent(
  content: HomeData["recent"][number],
): content is HomeData["recent"][number] & PromptCardDto {
  return (
    "coverImage" in content &&
    "domain" in content &&
    "slug" in content &&
    "tags" in content &&
    "visibility" in content
  )
}

function HomeSectionsView({ data }: Readonly<{ data: HomeData }>) {
  return (
    <>
      <section className="home-section" aria-labelledby="rubrics-heading">
        <h2 className="section-heading" id="rubrics-heading">
          Explorez les quatre rubriques
        </h2>
        <p className="section-intro">
          Des contenus pratiques, des formations et des occasions concrètes pour
          progresser.
        </p>
        <div className="rubric-grid">
          {data.sections.map((section) => (
            <Link
              aria-label={`Voir la rubrique ${section.title}, ${section.count} contenus`}
              className="rubric-entry"
              href={section.href}
              key={section.key}
            >
              <span className="rubric-title">{section.title}</span>
              <span className="rubric-count">{section.count}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-section" aria-labelledby="recent-heading">
        <h2 className="section-heading" id="recent-heading">
          À découvrir maintenant
        </h2>
        {data.recent.length === 0 ? (
          <p className="empty-state">
            Aucun contenu récent pour le moment. Les premières ressources
            arrivent bientôt.
          </p>
        ) : (
          <div className="recent-grid">
            {data.recent.map((content) =>
              isPromptCardContent(content) ? (
                <PromptCard
                  coverImage={content.coverImage}
                  domain={content.domain}
                  id={content.id}
                  key={content.id}
                  slug={content.slug}
                  summary={content.summary}
                  tags={content.tags}
                  title={content.title}
                  visibility={content.visibility}
                />
              ) : (
                <article className="ui-card" key={content.id}>
                  <Link href={content.href}>
                    <h3>{content.title}</h3>
                  </Link>
                  <p>{content.summary}</p>
                </article>
              ),
            )}
          </div>
        )}
      </section>
    </>
  )
}

async function HomeSections() {
  return <HomeSectionsView data={await getHomePageData()} />
}

function HomePageFrame({ sections }: Readonly<{ sections: ReactNode }>) {
  return (
    <main className="page-shell">
      <div className="content-wide">
        <section>
          <p className="eyebrow">Apprendre. Créer. Avancer.</p>
          <h1 className="hero-heading">
            Synapse rassemble les ressources qui font passer vos idées à
            <span className="gradient-text"> l&apos;action.</span>
          </h1>
          <p className="hero-copy">
            Synapse œuvre dans l&apos;accompagnement et la formation des jeunes
            ivoiriens. Cette plateforme réunit nos contenus en intelligence
            artificielle et en entrepreneuriat dans un point d&apos;entrée
            unique.
          </p>
        </section>

        {sections}

        <section className="home-section premium-callout">
          <div>
            <h2 className="section-heading">Un accès, pour toute la vie</h2>
            <p className="section-intro">
              Découvrez l&apos;offre premium Synapse et débloquez les ressources
              réservées aux membres.
            </p>
          </div>
          <Link className="premium-callout-link" href="/premium">
            Découvrir le premium
          </Link>
        </section>
      </div>
    </main>
  )
}

/**
 * Next appelle la page comme composant avec un objet de props : les agrégats
 * sont alors diffusés dans une frontière Suspense. L'appel direct sans props,
 * utilisé par les tests de Server Components, peut attendre le même service.
 */
export default function HomePage(
  props?: Readonly<Record<string, never>>,
): ReactNode | Promise<ReactNode> {
  if (props === undefined) {
    return getHomePageData().then((data) => (
      <HomePageFrame sections={<HomeSectionsView data={data} />} />
    ))
  }

  return (
    <HomePageFrame
      sections={
        <Suspense
          fallback={
            <p className="loading-state" role="status">
              Chargement des contenus…
            </p>
          }
        >
          <HomeSections />
        </Suspense>
      }
    />
  )
}
