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

type PromptShareProps = Readonly<{
  slug: string
  title: string
}>

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
  )
}

function CopyLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <path d="M20 11.5a8 8 0 0 1-11.8 7L4 19.5l1.1-4A8 8 0 1 1 20 11.5Z" />
      <path d="M9 8.5c.5 2.7 2 4.2 4.7 5l1.3-1.1 2 1.2c-.4 1.5-1.5 2.2-3 2.2-3.6-.2-6.5-3-6.7-6.7 0-1.5.7-2.6 2.2-3l1.2 2Z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height="20"
      viewBox="0 0 24 24"
      width="20"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 20v-7h2.3l.4-3h-2.7V8.4c0-.9.3-1.4 1.5-1.4h1.4V4.3c-.7-.1-1.4-.2-2.1-.2-2.2 0-3.8 1.4-3.8 4V10H8v3h2.5v7" />
    </svg>
  )
}

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

export function PromptShare({ slug, title }: PromptShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState("")

  function promptUrl(): string {
    return `${window.location.origin}/prompts/${slug}`
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(promptUrl())
      setStatus("Lien copié.")
    } catch {
      setStatus("Impossible de copier le lien.")
    } finally {
      setIsOpen(false)
    }
  }

  function shareOnWhatsApp(): void {
    const url = promptUrl()
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    )
    setIsOpen(false)
  }

  function shareOnFacebook(): void {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(promptUrl())}`,
      "_blank",
      "noopener,noreferrer",
    )
    setIsOpen(false)
  }

  return (
    <div className="prompt-share">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="prompt-share-button"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <ShareIcon />
        <span>Partager</span>
      </button>
      {isOpen ? (
        <div className="prompt-share-menu" role="menu">
          <button
            className="prompt-share-item"
            onClick={() => void copyLink()}
            role="menuitem"
            type="button"
          >
            <CopyLinkIcon />
            <span>Copier le lien</span>
          </button>
          <button
            className="prompt-share-item"
            onClick={shareOnWhatsApp}
            role="menuitem"
            type="button"
          >
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </button>
          <button
            className="prompt-share-item"
            onClick={shareOnFacebook}
            role="menuitem"
            type="button"
          >
            <FacebookIcon />
            <span>Facebook</span>
          </button>
        </div>
      ) : null}
      {status ? (
        <p aria-live="polite" className="prompt-share-status" role="status">
          {status}
        </p>
      ) : null}
    </div>
  )
}
