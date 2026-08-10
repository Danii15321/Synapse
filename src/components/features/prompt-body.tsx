import type { ReactNode } from "react"

const HEADING_LINE = /^(#{1,3})\s+(.+)$/u

function readableInlineMarkdown(value: string): string {
  return value.replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1")
}

export function PromptBody({ body }: Readonly<{ body: string }>) {
  const lines = body.split(/\r?\n/u)
  const hasMarkdownHeading = lines.some((line) =>
    HEADING_LINE.test(line.trim()),
  )

  if (!hasMarkdownHeading) {
    return (
      <div className="prompt-body-text">
        <p className="prompt-body-line">{body}</p>
      </div>
    )
  }

  const visibleLines = lines.map((line) => line.trim()).filter(Boolean)
  const content: ReactNode[] = []

  visibleLines.forEach((line, index) => {
    if (index > 0) content.push("\n")

    const heading = HEADING_LINE.exec(line)
    if (!heading) {
      content.push(readableInlineMarkdown(line))
      return
    }

    content.push(
      <span aria-level={heading[1]?.length ?? 3} key={index} role="heading">
        {readableInlineMarkdown(heading[2] ?? "")}
      </span>,
    )
  })

  return (
    <div className="prompt-body-text">
      <p className="prompt-body-line">{content}</p>
    </div>
  )
}
