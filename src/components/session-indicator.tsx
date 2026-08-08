"use client"

import Link from "next/link"

import { PremiumBadge } from "@/components/ui/premium-badge"

const MEMBERSHIP_STATUS = {
  FREE: <span className="session-membership">Membre gratuit</span>,
  PREMIUM: <PremiumBadge />,
} as const

type SessionIndicatorProps = Readonly<{
  authenticated: boolean
  membership: "FREE" | "PREMIUM" | null
}>

export function SessionIndicator({
  authenticated,
  membership,
}: SessionIndicatorProps) {
  if (!authenticated) {
    return (
      <div className="session-indicator">
        <Link className="session-link" href="/login">
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="session-indicator">
      <Link className="session-link" href="/compte">
        Compte
      </Link>
      {membership ? MEMBERSHIP_STATUS[membership] : null}
      <form action="/api/auth/logout" method="post">
        <button className="session-action" type="submit">
          Se déconnecter
        </button>
      </form>
    </div>
  )
}
