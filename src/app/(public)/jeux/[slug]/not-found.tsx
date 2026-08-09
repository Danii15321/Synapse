import Link from "next/link"

export default function JeuDetailNotFound() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">Concours introuvable</h1>
        <p className="message-copy">
          Ce jeu ou concours n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link className="inline-link" href="/jeux">
          Retour aux jeux
        </Link>
      </section>
    </main>
  )
}
