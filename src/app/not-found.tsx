import Link from "next/link"

const ROUTES = [
  ["Accueil", "/"],
  ["Prompts", "/prompts"],
  ["Formations", "/formations"],
  ["Jeux & concours", "/jeux"],
  ["Opportunités", "/opportunites"],
] as const

export default function NotFoundPage() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">Page introuvable</h1>
        <p className="message-copy">
          La page demandée n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <ul className="not-found-links">
          {ROUTES.map(([label, href]) => (
            <li key={href}>
              <Link className="inline-link min-h-touch" href={href}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
