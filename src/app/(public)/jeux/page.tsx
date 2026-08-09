import Link from "next/link"

import { JeuCard } from "@/components/features/jeu-card"
import { jeuListQuerySchema, type JeuListQuery } from "@/lib/validators/jeu"
import { getJeux } from "@/server/services/jeu-service"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

function nextPageHref(query: JeuListQuery, cursor: string): string {
  const params = new URLSearchParams({ cursor })
  if (query.take !== 24) params.set("take", String(query.take))
  return `/jeux?${params.toString()}`
}

export default async function JeuxPage({
  searchParams = Promise.resolve({}),
}: Readonly<{ searchParams?: Promise<SearchParams> }> = {}) {
  const parsedQuery = jeuListQuerySchema.safeParse(await searchParams)
  if (!parsedQuery.success) {
    return (
      <main className="page-shell">
        <section className="content-reading ui-card" role="alert">
          <h1 className="page-heading">La page demandée est invalide</h1>
          <p className="message-copy">Revenez à la liste des concours.</p>
        </section>
      </main>
    )
  }

  const { items, nextCursor } = await getJeux(parsedQuery.data)
  return (
    <main className="page-shell">
      <section className="content-wide">
        <p className="eyebrow">Relever un défi avec Synapse</p>
        <h1 className="page-heading">Jeux &amp; concours</h1>
        <p className="lead">
          Découvrez les activités, participez ici, puis retrouvez toutes les
          informations pratiques pour les vivre hors plateforme.
        </p>
        {items.length === 0 ? (
          <p className="empty-state">Aucun jeu ou concours disponible.</p>
        ) : (
          <div className="section-stack recent-grid">
            {items.map((jeu) => (
              <JeuCard key={jeu.id} {...jeu} />
            ))}
          </div>
        )}
        {nextCursor ? (
          <Link
            className="pagination-link"
            href={nextPageHref(parsedQuery.data, nextCursor)}
          >
            Page suivante
          </Link>
        ) : null}
      </section>
    </main>
  )
}
