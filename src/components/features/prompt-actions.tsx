"use client"

import { useState } from "react"

const CLAUDE_PREFILL_MAX_LENGTH = 14_000

const PROVIDERS = [
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "claude", label: "Claude", url: "https://claude.ai/new" },
] as const

type PromptActionsProps = Readonly<{
  allowClaudePrefill: boolean
  body: string
}>

export function PromptActions({
  allowClaudePrefill,
  body,
}: PromptActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState("")

  async function copyPrompt(
    nextMessage: string,
    failureMessage = "La copie a échoué. Sélectionnez le texte manuellement.",
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(body)
      setMessage(nextMessage)
    } catch {
      setMessage(failureMessage)
    }
  }

  async function openProvider(provider: (typeof PROVIDERS)[number]) {
    const prefillClaude =
      provider.id === "claude" &&
      allowClaudePrefill &&
      body.length <= CLAUDE_PREFILL_MAX_LENGTH
    const providerUrl = prefillClaude
      ? `claude://claude.ai/new?q=${encodeURIComponent(body)}`
      : provider.url
    const popup = window.open(providerUrl, "_blank", "noopener,noreferrer")
    if (popup) popup.opener = null
    setMenuOpen(false)
    await copyPrompt(
      prefillClaude
        ? "Ouverture de Claude avec le prompt prérempli. Une copie de secours est prête."
        : `Prompt copié. À coller dans ${provider.label}.`,
      prefillClaude
        ? "Ouverture de Claude avec le prompt prérempli, mais la copie de secours a échoué."
        : undefined,
    )
  }

  return (
    <div className="prompt-actions">
      <div className="prompt-action-row">
        <button
          className="prompt-action-button"
          onClick={() => copyPrompt("Prompt copié. Vous pouvez le coller.")}
          type="button"
        >
          Copier
        </button>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="prompt-action-button"
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          Ouvrir dans…
        </button>
      </div>
      {menuOpen ? (
        <div className="prompt-provider-menu" role="menu">
          {PROVIDERS.map((provider) => (
            <button
              className="prompt-provider-item"
              key={provider.label}
              onClick={() => openProvider(provider)}
              role="menuitem"
              type="button"
            >
              {provider.label}
            </button>
          ))}
        </div>
      ) : null}
      <p aria-live="polite" className="prompt-action-status" role="status">
        {message}
      </p>
    </div>
  )
}
