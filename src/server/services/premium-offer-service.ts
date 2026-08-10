import "server-only"

import { premiumOfferSchema } from "@/lib/validators/premium-offer"
import { getPremiumContentCounts } from "@/server/repositories/premium-offer-repository"

const PREMIUM_PRICE_AMOUNT = 7_550

/**
 * Spécification : construit l'offre PREMIUM publique à partir des seuls
 * contenus PREMIUM publiés. Les quatre compteurs restent explicites, y compris
 * lorsqu'ils valent zéro. Le paiement est unique et ouvre un accès à vie.
 */
export async function getPremiumOffer() {
  const counts = await getPremiumContentCounts()

  return premiumOfferSchema.parse({
    counts,
    price: {
      amount: PREMIUM_PRICE_AMOUNT,
      currency: "XOF",
    },
  })
}
