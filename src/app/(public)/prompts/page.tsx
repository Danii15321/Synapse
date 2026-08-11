import Link from "next/link"

import { PromptCard } from "@/components/features/prompt-card"
import {
  promptListQuerySchema,
  type PromptListQuery,
} from "@/lib/validators/prompt"
import { getPrompts } from "@/server/services/prompt-service"

export const dynamic = "force-dynamic"

const DOMAIN_OPTIONS = [
  ["ia", "Intelligence artificielle"],
  ["entrepreneuriat", "Entrepreneuriat"],
  ["productivite", "Productivité"],
  ["communication", "Communication"],
] as const

type SearchParams = Record<string, string | string[] | undefined>

function nextPageHref(query: PromptListQuery, cursor: string): string {
  const params = new URLSearchParams()
  if (query.domain) params.set("domain", query.domain)
  if (query.search) params.set("search", query.search)
  if (query.tag) params.set("tag", query.tag)
  params.set("cursor", cursor)
  return `/prompts?${params.toString()}`
}

export default async function PromptsPage({
  searchParams = Promise.resolve({}),
}: Readonly<{ searchParams?: Promise<SearchParams> }> = {}) {
  const parsedQuery = promptListQuerySchema.safeParse(await searchParams)
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

  const { items, nextCursor } = await getPrompts(parsedQuery.data)

  return (
    <main className="page-shell">
      <section className="content-wide">
        <p className="eyebrow">Bibliothèque Synapse</p>
        <h1 className="page-heading">Prompts</h1>
        <form action="/prompts" className="prompt-filters" method="get">
          <label className="field-stack">
            <span className="field-label">Domaine</span>
            <select
              className="ui-input"
              defaultValue={parsedQuery.data.domain ?? ""}
              name="domain"
            >
              <option value="">Tous les domaines</option>
              {DOMAIN_OPTIONS.map(([value, label]) => (
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
            Aucun prompt ne correspond à cette recherche.
          </p>
        ) : (
          <div className="section-stack recent-grid">
            {items.map((prompt) => (
              <PromptCard key={prompt.id} {...prompt} />
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
