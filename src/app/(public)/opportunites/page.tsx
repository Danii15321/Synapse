import Link from "next/link"

import { OpportuniteCard } from "@/components/features/opportunite-card"
import {
  opportuniteListQuerySchema,
  type OpportuniteListQuery,
} from "@/lib/validators/opportunite"
import { getOpportunites } from "@/server/services/opportunite-service"

export const dynamic = "force-dynamic"

const TYPE_OPTIONS = [
  ["STAGE", "Stage"],
  ["EMPLOI", "Emploi"],
  ["APPEL_OFFRE", "Appel d'offre"],
  ["FINANCEMENT", "Financement"],
  ["COLLABORATION", "Collaboration"],
] as const

type SearchParams = Record<string, string | string[] | undefined>

function nextPageHref(query: OpportuniteListQuery, cursor: string): string {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.type) params.set("type", query.type)
  params.set("cursor", cursor)
  return `/opportunites?${params.toString()}`
}
export default async function OpportunitesPage({
  searchParams = Promise.resolve({}),
}: Readonly<{ searchParams?: Promise<SearchParams> }> = {}) {
  const parsedQuery = opportuniteListQuerySchema.safeParse(await searchParams)
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

  const { items, nextCursor } = await getOpportunites(parsedQuery.data)

  return (
    <main className="page-shell">
      <section className="content-wide">
        <p className="eyebrow">Saisir les bonnes occasions</p>
        <h1 className="page-heading">Bons plans &amp; opportunités</h1>
        <form action="/opportunites" className="prompt-filters" method="get">
          <label className="field-stack">
            <span className="field-label">Rechercher</span>
            <input
              className="ui-input"
              defaultValue={parsedQuery.data.search ?? ""}
              name="search"
              placeholder="Ex. stage à Abidjan"
              type="search"
            />
          </label>
          <label className="field-stack">
            <span className="field-label">Type</span>
            <select
              className="ui-input"
              defaultValue={parsedQuery.data.type ?? ""}
              name="type"
            >
              <option value="">Tous les types</option>
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="ui-button prompt-filter-submit" type="submit">
            Appliquer les filtres
          </button>
        </form>

        {items.length === 0 ? (
          <p className="empty-state">
            Aucune opportunité ne correspond à cette recherche.
          </p>
        ) : (
          <div className="section-stack recent-grid">
            {items.map((opportunite) => (
              <OpportuniteCard key={opportunite.id} {...opportunite} />
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
