export function PromptCard({
  title,
  summary,
}: Readonly<{ title: string; summary: string }>) {
  return (
    <article className="rounded-card bg-surface p-5 shadow-card sm:p-6">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <p className="mt-3 leading-7 text-foreground/70">{summary}</p>
    </article>
  )
}
