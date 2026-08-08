import { PromptCard } from "@/components/features/prompt-card"
import { getPrompts } from "@/server/services/prompt-service"

export const dynamic = "force-dynamic"

export default async function PromptsPage() {
  const prompts = await getPrompts()

  return (
    <main className="page-shell">
      <section className="content-reading">
        <p className="eyebrow">Bibliothèque Synapse</p>
        <h1 className="page-heading">Prompts</h1>
        {prompts.length === 0 ? (
          <p className="empty-state">
            Aucun prompt n’est disponible pour le moment.
          </p>
        ) : (
          <div className="section-stack recent-grid">
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
