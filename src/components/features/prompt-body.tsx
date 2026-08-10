import type { ReactNode } from "react"

function readableInlineMarkdown(line: string): string {
  return line.replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1")
}

export function PromptBody({ body }: Readonly<{ body: string }>) {
  const lines = body.split(/\r?\n/u)
  const hasMarkdownHeading = lines.some((line) =>
    /^(#{1,3})\s+(.+)$/u.test(line.trim()),
  )

  if (!hasMarkdownHeading) {
    return (
      <div className="prompt-body-text">
        <p className="prompt-body-line">{body}</p>
      </div>
    )
  }

  const blocks: ReactNode[] = []
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line)
    if (heading) {
      blocks.push(
        <h3 className="prompt-body-heading" key={index}>
          {readableInlineMarkdown(heading[2] ?? "")}
        </h3>,
      )
      continue
    }

    blocks.push(
      <p className="prompt-body-line" key={index}>
        {readableInlineMarkdown(line)}
      </p>,
    )
  }

  return <div className="prompt-body-text">{blocks}</div>
}
