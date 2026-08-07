import { PromptCard } from "@/components/features/prompt-card"
import { getPrompts } from "@/server/services/prompt-service"

export default async function PromptsPage() {
  const prompts = await getPrompts()

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <section className="mx-auto w-full max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Synapse
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Prompts</h1>

        {prompts.length === 0 ? (
          <p className="mt-8 rounded-card bg-surface p-5 text-foreground/70 shadow-card">
            Aucun prompt n’est disponible pour le moment.
          </p>
        ) : (
          <div className="mt-8 grid gap-4">
            {prompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                summary={prompt.summary}
                title={prompt.title}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
