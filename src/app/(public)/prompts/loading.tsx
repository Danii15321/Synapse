export default function PromptsLoading() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <p
        className="mx-auto w-full max-w-2xl rounded-card bg-surface p-5 text-foreground/70 shadow-card"
        role="status"
      >
        Chargement des prompts…
      </p>
    </main>
  )
}
