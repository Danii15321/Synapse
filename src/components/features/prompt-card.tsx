export function PromptCard({
  title,
  summary,
}: Readonly<{ title: string; summary: string }>) {
  return (
    <article className="ui-card">
      <h2 className="card-heading">{title}</h2>
      <p className="card-copy">{summary}</p>
    </article>
  )
}
