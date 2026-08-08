import type { ReactNode } from "react"

function readableInlineMarkdown(line: string): string {
  return line.replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/`([^`]+)`/gu, "$1")
}

export function PromptBody({ body }: Readonly<{ body: string }>) {
  const blocks: ReactNode[] = []

  for (const [index, rawLine] of body.split(/\r?\n/u).entries()) {
    const line = rawLine.trim()
    if (!line) continue

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line)
    if (heading) {
      const text = readableInlineMarkdown(heading[2] ?? "")
      blocks.push(
        <h3 className="prompt-body-heading" key={index}>
          {text}
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
