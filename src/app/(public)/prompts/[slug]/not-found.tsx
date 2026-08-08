import Link from "next/link"

export default function PromptDetailNotFound() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">Prompt introuvable</h1>
        <p className="message-copy">
          Ce prompt n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link className="inline-link" href="/prompts">
          Retour aux prompts
        </Link>
      </section>
    </main>
  )
}
