"use client"

import { Button } from "@/components/ui/button"

export default function PromptsError({
  reset,
}: Readonly<{ error: Error; reset: () => void }>) {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card" role="alert">
        <h1 className="page-heading">Les prompts sont indisponibles</h1>
        <p className="message-copy">
          Une erreur empêche leur affichage pour le moment.
        </p>
        <Button onClick={reset} type="button">
          Réessayer
        </Button>
      </section>
    </main>
  )
}
