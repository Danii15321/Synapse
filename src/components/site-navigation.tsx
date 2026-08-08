import Link from "next/link"

import { MobileMenu } from "@/components/mobile-menu"
import { SessionIndicator } from "@/components/session-indicator"
import { CspImage } from "@/components/ui/csp-image"

type SiteNavigationProps = Readonly<{
  authenticated: boolean
  membership: "FREE" | "PREMIUM" | null
}>

export function SiteNavigation({
  authenticated,
  membership,
}: SiteNavigationProps) {
  return (
    <header className="site-header">
      <nav aria-label="Navigation principale" className="site-navigation">
        <Link aria-label="Synapse — Accueil" className="brand-link" href="/">
          <CspImage
            alt=""
            className="brand-mark"
            height={48}
            priority
            src="/brand/synapse-pictogram.webp"
            width={48}
          />
          <span className="brand-word">Synapse</span>
        </Link>
        <SessionIndicator
          authenticated={authenticated}
          membership={membership}
        />
        <MobileMenu />
      </nav>
    </header>
  )
}
