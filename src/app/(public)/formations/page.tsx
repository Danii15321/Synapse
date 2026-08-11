import Link from "next/link"

import { FormationCard } from "@/components/features/formation-card"
import {
  formationListQuerySchema,
  type FormationListQuery,
} from "@/lib/validators/formation"
import { getFormations } from "@/server/services/formation-service"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

function nextPageHref(query: FormationListQuery, cursor: string): string {
  const params = new URLSearchParams()
  if (query.kind) params.set("kind", query.kind)
  if (query.level) params.set("level", query.level)
  if (query.search) params.set("search", query.search)
  params.set("cursor", cursor)
  return `/formations?${params.toString()}`
}

export default async function FormationsPage({
  searchParams = Promise.resolve({}),
}: Readonly<{ searchParams?: Promise<SearchParams> }> = {}) {
  const parsedQuery = formationListQuerySchema.safeParse(await searchParams)
  if (!parsedQuery.success) {
    return (
      <main className="page-shell">
        <section className="content-reading ui-card" role="alert">
          <h1 className="page-heading">Les filtres sont invalides</h1>
          <p className="message-copy">
            Réinitialisez la recherche puis réessayez.
          </p>
        </section>
      </main>
    )
  }

  const { items, nextCursor } = await getFormations(parsedQuery.data)

  return (
    <main className="page-shell">
      <section className="content-wide">
        <p className="eyebrow">Apprendre avec Synapse</p>
        <h1 className="page-heading">Formations</h1>
        {items.length === 0 ? (
          <p className="empty-state">
            Aucune formation ne correspond à cette recherche.
          </p>
        ) : (
          <div className="section-stack recent-grid">
            {items.map((formation) => (
              <FormationCard key={formation.id} {...formation} />
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
