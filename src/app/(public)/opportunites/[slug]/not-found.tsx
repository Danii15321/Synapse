import Link from "next/link"

export default function OpportuniteDetailNotFound() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">Opportunité introuvable</h1>
        <p className="message-copy">
          Cette opportunité n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link className="inline-link" href="/opportunites">
          Retour aux opportunités
        </Link>
      </section>
    </main>
  )
}

