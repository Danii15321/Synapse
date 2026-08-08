"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"

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
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card" role="alert">
        <h1 className="page-heading">Une erreur est survenue</h1>
        <p className="message-copy">
          La page ne peut pas être affichée pour le moment.
        </p>
        {errorId ? <p className="message-copy">Référence : {errorId}</p> : null}
        <div className="error-actions">
          <Button onClick={reset} type="button">
            Réessayer
          </Button>
          <Link className="inline-link" href="/">
            Retour à l&apos;accueil
          </Link>
        </div>
      </section>
    </main>
  )
}
