"use client"

export default function PromptDetailError({
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <section
        className="w-full max-w-lg rounded-card bg-surface p-6 text-center shadow-card"
        role="alert"
      >
        <h1 className="text-2xl font-bold">Ce prompt est indisponible</h1>
        <p className="mt-3 text-foreground/70">
          Une erreur empêche son affichage pour le moment.
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
