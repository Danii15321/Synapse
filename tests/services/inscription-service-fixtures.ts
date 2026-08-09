import { vi } from "vitest"

import { isRecord, scenario } from "../repositories/jeux-inscriptions-fixtures"

export { scenario }

export type SessionUser = Readonly<{
  email: string
  id: string
  membership: "FREE" | "PREMIUM"
}>

export const FREE_USER: SessionUser = {
  email: "free@example.test",
  id: "free-user",
  membership: "FREE",
}

export const PREMIUM_USER: SessionUser = {
  email: "premium@example.test",
  id: "premium-user",
  membership: "PREMIUM",
}

export type InscriptionService = Readonly<{
  cancelFormationParticipation: (
    slug: string,
    user: SessionUser | null,
  ) => Promise<unknown>
  cancelJeuParticipation: (
    slug: string,
    user: SessionUser | null,
  ) => Promise<unknown>
  getMyParticipations: (
    query: Readonly<Record<string, unknown>>,
    user: SessionUser | null,
  ) => Promise<unknown>
  participateInFormation: (
    slug: string,
    user: SessionUser | null,
  ) => Promise<unknown>
  participateInJeu: (slug: string, user: SessionUser | null) => Promise<unknown>
}>

function isInscriptionService(value: unknown): value is InscriptionService {
  return (
    isRecord(value) &&
    typeof value.cancelFormationParticipation === "function" &&
    typeof value.cancelJeuParticipation === "function" &&
    typeof value.getMyParticipations === "function" &&
    typeof value.participateInFormation === "function" &&
    typeof value.participateInJeu === "function"
  )
}

export async function loadInscriptionService(): Promise<InscriptionService> {
  const module: unknown = await import("@/server/services/inscription-service")
  if (!isInscriptionService(module)) {
    throw new Error("inscription-service doit exposer le parcours complet")
  }
  return module
}

export function resetInscriptionMocks(): void {
  vi.doUnmock("@/server/access/entitlement")
  vi.doUnmock("@/server/repositories/formation-repository")
  vi.doUnmock("@/server/repositories/inscription-repository")
  vi.doUnmock("@/server/repositories/jeu-repository")
  vi.restoreAllMocks()
  vi.resetModules()
}
