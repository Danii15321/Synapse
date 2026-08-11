"use client"

import Link from "next/link"
import { useEffect, useId, useRef, useState } from "react"

const NAVIGATION_LINKS = [
  ["Prompts", "/prompts"],
  ["Formations", "/formations"],
  ["Jeux & concours", "/jeux"],
  ["Bons plans & opportunités", "/opportunites"],
] as const

type MobileMenuProps = Readonly<{
  showLogin: boolean
}>

export function MobileMenu({ showLogin }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const focusable = panel?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    )
    focusable?.item(0).focus()

    function closeAndRestoreFocus() {
      setOpen(false)
      toggleRef.current?.focus()
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeAndRestoreFocus()
        return
      }
      if (event.key !== "Tab" || !focusable?.length) return

      const first = focusable.item(0)
      const last = focusable.item(focusable.length - 1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <div className="mobile-menu-container" ref={containerRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        className="mobile-menu-toggle"
        onClick={() => setOpen((current) => !current)}
        ref={toggleRef}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="mobile-menu-icon"
          focusable="false"
          height="24"
          viewBox="0 0 24 24"
          width="24"
        >
          <line x1="4" x2="20" y1="6" y2="6" />
          <line x1="4" x2="20" y1="12" y2="12" />
          <line x1="4" x2="20" y1="18" y2="18" />
        </svg>
      </button>
      <div
        className={
          open
            ? "mobile-menu-panel"
            : "mobile-menu-panel mobile-menu-panel-closed"
        }
        id={menuId}
        ref={panelRef}
      >
        <ul className="primary-navigation-list">
          {NAVIGATION_LINKS.map(([label, href]) => (
            <li key={href}>
              <Link
                className="primary-navigation-link"
                href={href}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            </li>
          ))}
          {showLogin ? (
            <li>
              <Link
                className="primary-navigation-link"
                href="/login"
                onClick={() => setOpen(false)}
              >
                Connexion
              </Link>
            </li>
          ) : null}
        </ul>
        <button
          className="mobile-menu-close"
          onClick={() => {
            setOpen(false)
            toggleRef.current?.focus()
          }}
          type="button"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
