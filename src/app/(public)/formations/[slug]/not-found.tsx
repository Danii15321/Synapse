import Link from "next/link"

export default function FormationDetailNotFound() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">Formation introuvable</h1>
        <p className="message-copy">
          Cette formation n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link className="inline-link" href="/formations">
          Retour aux formations
        </Link>
      </section>
    </main>
  )
}

