import Link from "next/link"

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-card bg-surface p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="mt-3 text-foreground/70">
          La page demandée n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link
          className="mt-6 inline-flex min-h-touch items-center justify-center rounded-control bg-accent px-5 font-semibold text-white"
          href="/"
        >
          Retour à l&apos;accueil
        </Link>
      </section>
    </main>
  )
}
