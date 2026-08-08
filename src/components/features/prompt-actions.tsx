"use client"

import { useState } from "react"

const PROVIDERS = [
  { label: "ChatGPT", url: "https://chatgpt.com/" },
  { label: "Claude", url: "https://claude.ai/new" },
] as const

export function PromptActions({ body }: Readonly<{ body: string }>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [message, setMessage] = useState("")

  async function copyPrompt(nextMessage: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(body)
      setMessage(nextMessage)
    } catch {
      setMessage("La copie a échoué. Sélectionnez le texte manuellement.")
    }
  }

  async function openProvider(provider: (typeof PROVIDERS)[number]) {
    const popup = window.open(provider.url, "_blank", "noopener,noreferrer")
    if (popup) popup.opener = null
    setMenuOpen(false)
    await copyPrompt(`Prompt copié. À coller dans ${provider.label}.`)
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
