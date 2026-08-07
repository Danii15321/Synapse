export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-xl rounded-card bg-surface p-8 text-center shadow-card sm:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Synapse
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Le socle est prêt.
        </h1>
        <p className="mt-4 text-base leading-7 text-foreground/70">
          Une fondation légère et mobile pour construire la plateforme de
          contenu.
        </p>
      </section>
    </main>
  )
}
