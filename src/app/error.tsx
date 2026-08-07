"use client"

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>

const ERROR_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const errorId =
    error.digest && ERROR_ID_PATTERN.test(error.digest)
      ? error.digest
      : undefined

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-card bg-surface p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-3 text-foreground/70">
          La page ne peut pas être affichée pour le moment.
        </p>
        {errorId ? (
          <p className="mt-3 break-all text-sm text-foreground/70">
            Référence : {errorId}
          </p>
        ) : null}
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
