"use client"

export default function ErrorPage({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-card bg-surface p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-3 text-foreground/70">
          La page ne peut pas être affichée pour le moment.
        </p>
        <button
          className="mt-6 min-h-touch rounded-control bg-accent px-5 font-semibold text-white"
          onClick={reset}
          type="button"
        >
          Réessayer
        </button>
      </section>
    </main>
  )
}
