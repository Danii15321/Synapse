import "server-only"

import { grantPremium as persistPremiumGrant } from "@/server/repositories/membership-repository"

/**
 * Spécification : attribue explicitement l'accès PREMIUM à un utilisateur via
 * l'unique transaction repository. Un compte déjà PREMIUM reste inchangé et
 * ne reçoit pas de nouvelle trace d'attribution.
 */
async function grantPremium(userId: string, source: string) {
  return persistPremiumGrant(userId, source)
}

export const membershipService = { grantPremium }
