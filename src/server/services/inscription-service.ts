import "server-only"

import type { SessionUser } from "@/lib/validators/auth"
import type {
  ParticipationConfirmation,
  ParticipationListQuery,
  ParticipationPage,
  ParticipationState,
} from "@/lib/validators/inscription"
import { participationPageSchema } from "@/lib/validators/inscription"
import { canAccess } from "@/server/access/entitlement"
import {
  ActivityFullError,
  ContentNotFoundError,
  NotEntitledError,
  ParticipationNotAllowedError,
  RegistrationsClosedError,
  UnauthorizedError,
} from "@/server/errors"
import { findParticipationMetaBySlug as findFormationParticipationMeta } from "@/server/repositories/formation-repository"
import {
  cancelFormationParticipation as cancelFormationRow,
  cancelJeuParticipation as cancelJeuRow,
  countJeuParticipations,
  findManyByUserId,
  hasFormationParticipation,
  hasJeuParticipation,
  reserveFormationParticipation,
  reserveJeuPlace,
} from "@/server/repositories/inscription-repository"
import { findParticipationMetaBySlug as findJeuParticipationMeta } from "@/server/repositories/jeu-repository"

function requireSessionUser(user: SessionUser | null): SessionUser {
  if (!user) throw new UnauthorizedError()
  return user
}

function ensureEntitled(
  user: SessionUser,
  resource: "formation" | "jeu",
  visibility: "FREE" | "PREMIUM",
): void {
  if (!canAccess(user, { visibility })) {
    throw new NotEntitledError(resource, "PREMIUM")
  }
}

function formatFormationLocation(
  format: "EN_LIGNE" | "HYBRIDE" | "PRESENTIEL",
): string {
  if (format === "EN_LIGNE") return "En ligne"
  if (format === "HYBRIDE") return "Hybride"
  return "Présentiel"
}

/**
 * Spécification : une participation exige la session, l'entitlement, une
 * activité publiée et ouverte. La capacité et l'idempotence sont arbitrées
 * atomiquement par le repository. Aucune donnée de formulaire n'est requise.
 */
export async function participateInJeu(
  slug: string,
  user: SessionUser | null,
): Promise<ParticipationConfirmation> {
  const sessionUser = requireSessionUser(user)
  const meta = await findJeuParticipationMeta(slug)
  if (!meta) throw new ContentNotFoundError("jeu", slug)
  ensureEntitled(sessionUser, "jeu", meta.visibility)
  if (!meta.publishedAt || (meta.closesAt && meta.closesAt <= new Date())) {
    throw new RegistrationsClosedError()
  }

  const reservation = await reserveJeuPlace({
    capacity: meta.capacity,
    jeuId: meta.id,
    userId: sessionUser.id,
  })
  if (reservation.status === "FULL") throw new ActivityFullError()

  return {
    activityType: "JEU",
    emailConfirmation: false,
    location: meta.location,
    startsAt: meta.startsAt?.toISOString() ?? null,
    status: reservation.status,
    title: meta.title,
  }
}

/**
 * Spécification : seules les formations EVENEMENTIELLE publiées et futures
 * acceptent une participation. FREE/PREMIUM reste un axe indépendant et le
 * corps de formation n'est jamais chargé par ce chemin d'écriture.
 */
export async function participateInFormation(
  slug: string,
  user: SessionUser | null,
): Promise<ParticipationConfirmation> {
  const sessionUser = requireSessionUser(user)
  const meta = await findFormationParticipationMeta(slug)
  if (!meta) throw new ContentNotFoundError("formation", slug)
  if (meta.kind !== "EVENEMENTIELLE") {
    throw new ParticipationNotAllowedError()
  }
  ensureEntitled(sessionUser, "formation", meta.visibility)
  if (!meta.publishedAt || !meta.startsAt || meta.startsAt <= new Date()) {
    throw new RegistrationsClosedError()
  }

  const reservation = await reserveFormationParticipation({
    formationId: meta.id,
    userId: sessionUser.id,
  })
  return {
    activityType: "FORMATION",
    emailConfirmation: false,
    location: formatFormationLocation(meta.format),
    startsAt: meta.startsAt.toISOString(),
    status:
      reservation.status === "FULL" ? "ALREADY_REGISTERED" : reservation.status,
    title: meta.title,
  }
}

export async function getMyParticipations(
  query: ParticipationListQuery,
  user: SessionUser | null,
): Promise<ParticipationPage> {
  const sessionUser = requireSessionUser(user)
  const page = await findManyByUserId({ ...query, userId: sessionUser.id })
  return participationPageSchema.parse({
    items: page.items.map((item) => ({
      activityType: item.activityType,
      id: item.id,
      location:
        item.activityType === "FORMATION"
          ? formatFormationLocation(item.format)
          : item.location,
      slug: item.slug,
      startsAt: item.startsAt?.toISOString() ?? null,
      title: item.title,
    })),
    nextCursor: page.nextCursor,
  })
}

export async function cancelJeuParticipation(
  slug: string,
  user: SessionUser | null,
): Promise<void> {
  const sessionUser = requireSessionUser(user)
  const meta = await findJeuParticipationMeta(slug)
  if (!meta) throw new ContentNotFoundError("jeu", slug)
  await cancelJeuRow({ jeuId: meta.id, userId: sessionUser.id })
}

export async function cancelFormationParticipation(
  slug: string,
  user: SessionUser | null,
): Promise<void> {
  const sessionUser = requireSessionUser(user)
  const meta = await findFormationParticipationMeta(slug)
  if (!meta) throw new ContentNotFoundError("formation", slug)
  if (meta.kind !== "EVENEMENTIELLE") {
    throw new ParticipationNotAllowedError()
  }
  await cancelFormationRow({ formationId: meta.id, userId: sessionUser.id })
}

export async function getParticipationState(
  activityType: "FORMATION" | "JEU",
  slug: string,
  user: SessionUser | null,
): Promise<ParticipationState> {
  const sessionUser = requireSessionUser(user)

  if (activityType === "FORMATION") {
    const meta = await findFormationParticipationMeta(slug)
    if (!meta) throw new ContentNotFoundError("formation", slug)
    if (meta.kind !== "EVENEMENTIELLE") {
      throw new ParticipationNotAllowedError()
    }
    if (!canAccess(sessionUser, { visibility: meta.visibility })) {
      return "PREMIUM_REQUIRED"
    }
    if (!meta.publishedAt || !meta.startsAt || meta.startsAt <= new Date()) {
      return "CLOSED"
    }
    return (await hasFormationParticipation({
      formationId: meta.id,
      userId: sessionUser.id,
    }))
      ? "ALREADY_REGISTERED"
      : "AVAILABLE"
  }

  const meta = await findJeuParticipationMeta(slug)
  if (!meta) throw new ContentNotFoundError("jeu", slug)
  if (!canAccess(sessionUser, { visibility: meta.visibility })) {
    return "PREMIUM_REQUIRED"
  }
  if (!meta.publishedAt || (meta.closesAt && meta.closesAt <= new Date())) {
    return "CLOSED"
  }
  if (await hasJeuParticipation({ jeuId: meta.id, userId: sessionUser.id })) {
    return "ALREADY_REGISTERED"
  }
  if (
    meta.capacity !== null &&
    (await countJeuParticipations(meta.id)) >= meta.capacity
  ) {
    return "FULL"
  }
  return "AVAILABLE"
}
