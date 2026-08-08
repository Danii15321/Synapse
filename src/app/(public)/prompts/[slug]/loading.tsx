export default function PromptDetailLoading() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <p
        className="mx-auto w-full max-w-3xl rounded-card bg-surface p-5 text-foreground/70 shadow-card"
        role="status"
      >
        Chargement du prompt…
      </p>
    </main>
  )
}
