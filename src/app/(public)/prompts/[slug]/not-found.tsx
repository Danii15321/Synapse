import Link from "next/link"

export default function PromptDetailNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-lg rounded-card bg-surface p-6 text-center shadow-card">
        <h1 className="text-2xl font-bold">Prompt introuvable</h1>
        <p className="mt-3 text-foreground/70">
          Ce prompt n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link
          className="mt-6 inline-flex min-h-touch items-center justify-center rounded-control bg-accent px-5 font-semibold text-white"
          href="/prompts"
        >
          Retour aux prompts
        </Link>
      </section>
    </main>
  )
}
