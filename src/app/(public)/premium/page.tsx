import type { Metadata } from "next"

import { PremiumTunnel } from "@/components/features/premium-tunnel"
import { auth } from "@/server/auth/config"
import { getPremiumOffer } from "@/server/services/premium-offer-service"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  description:
    "Découvrez l'offre Premium Synapse : paiement unique, accès à vie et sans abonnement.",
  title: "Premium",
}

export default async function PremiumPage() {
  const [offer, session] = await Promise.all([getPremiumOffer(), auth()])

  return (
    <main className="page-shell">
      <div className="content-wide">
        <PremiumTunnel
          accountEmail={session?.user.email ?? null}
          offer={offer}
        />
      </div>
    </main>
  )
}
