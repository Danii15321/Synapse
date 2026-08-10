import { Fragment, type ReactNode } from "react"

const HEADING_LINE = /^(#{1,3})\s+(.+)$/u

const INLINE_MARKDOWN = /(\*\*([^*]+)\*\*|`([^`]+)`)/gu

function sourcePreservingInlineMarkdown(
  value: string,
  lineIndex: number,
): ReactNode[] {
  const content: ReactNode[] = []
  let offset = 0

  for (const [matchIndex, match] of [
    ...value.matchAll(INLINE_MARKDOWN),
  ].entries()) {
    const matched = match[0]
    const start = match.index
    const marker = match[2] === undefined ? "`" : "**"
    const readable = match[2] ?? match[3] ?? ""

    content.push(value.slice(offset, start))
    content.push(
      <Fragment key={`${lineIndex}-inline-${matchIndex}`}>
        <span aria-hidden="true" className="prompt-markdown-token">
          {marker}
        </span>
        {readable}
        <span aria-hidden="true" className="prompt-markdown-token">
          {marker}
        </span>
      </Fragment>,
    )
    offset = start + matched.length
  }

  content.push(value.slice(offset))
  return content
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

  const content: ReactNode[] = []
  let hasVisibleLine = false

  lines.forEach((sourceLine, index) => {
    const line = sourceLine.trim()
    const visibleBoundary = line.length > 0 && hasVisibleLine

    if (index > 0) {
      content.push(
        visibleBoundary ? (
          "\n"
        ) : (
          <span
            aria-hidden="true"
            className="prompt-markdown-token"
            key={`${index}-line-break`}
          >
            {"\n"}
          </span>
        ),
      )
    }

    if (!line) {
      content.push(
        <span
          aria-hidden="true"
          className="prompt-markdown-token"
          key={`${index}-blank`}
        >
          {sourceLine}
        </span>,
      )
      return
    }

    const leadingLength = sourceLine.indexOf(line)
    const trailingStart = leadingLength + line.length
    const leading = sourceLine.slice(0, leadingLength)
    const trailing = sourceLine.slice(trailingStart)

    content.push(
      <span
        aria-hidden="true"
        className="prompt-markdown-token"
        key={`${index}-leading`}
      >
        {leading}
      </span>,
    )

    const heading = HEADING_LINE.exec(line)
    if (!heading) {
      content.push(...sourcePreservingInlineMarkdown(line, index))
    } else {
      const marker = `${heading[1] ?? ""} `
      content.push(
        <span
          aria-hidden="true"
          className="prompt-markdown-token"
          key={`${index}-heading-marker`}
        >
          {marker}
        </span>,
        <span aria-level={heading[1]?.length ?? 3} key={index} role="heading">
          {sourcePreservingInlineMarkdown(heading[2] ?? "", index)}
        </span>,
      )
    }

    content.push(
      <span
        aria-hidden="true"
        className="prompt-markdown-token"
        key={`${index}-trailing`}
      >
        {trailing}
      </span>,
    )
    hasVisibleLine = true
  })

  return (
    <div className="prompt-body-text">
      <p className="prompt-body-line">{content}</p>
    </div>
  )
}
