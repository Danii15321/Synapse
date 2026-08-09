"use client"

import { Button } from "@/components/ui/button"
import { useParticipationControl } from "@/hooks/use-participation"
import type { ParticipationState } from "@/lib/validators/inscription"

type ParticipationControlProps = Readonly<{
  activityType: "FORMATION" | "JEU"
  initialState: ParticipationState
  location: string | null
  slug: string
  startsAt: string | null
}>

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

function StaticState({ state }: Readonly<{ state: ParticipationState }>) {
  if (state === "PREMIUM_REQUIRED") {
    return <p>Participation réservée aux membres premium. Devenir membre.</p>
  }
  if (state === "CLOSED") return <p>Participations closes.</p>
  if (state === "FULL")
    return <p>Cette activité est complète : plus de place.</p>
  if (state === "ALREADY_REGISTERED") {
    return <p>Participation confirmée : vous êtes déjà inscrit.</p>
  }
  return null
}

export default function ParticipationControl({
  activityType,
  initialState,
  location,
  slug,
  startsAt,
}: ParticipationControlProps) {
  const { cancel, confirmation, error, participate, pending, state } =
    useParticipationControl({ activityType, initialState, slug })

  const confirmed = state === "ALREADY_REGISTERED"
  const shownLocation = confirmation?.location ?? location
  const shownStartsAt = confirmation?.startsAt ?? startsAt

  return (
    <section className="detail-section participation-panel ui-card">
      <h2 className="card-heading">Participation</h2>
      {state !== "AVAILABLE" && !confirmation ? (
        <StaticState state={state} />
      ) : null}
      {confirmed && confirmation ? (
        <div className="participation-confirmation">
          <p className="participation-success">Participation confirmée</p>
          {shownStartsAt ? <p>Date : {formatDate(shownStartsAt)}</p> : null}
          {shownLocation ? <p>Lieu ou modalité : {shownLocation}</p> : null}
          <p>Aucun e-mail ne sera envoyé : conservez ces informations.</p>
        </div>
      ) : null}
      {pending ? <p role="status">Participation en cours…</p> : null}
      {error ? (
        <p className="form-message" role="alert">
          La demande n&apos;a pas pu être traitée. Réessayez.
        </p>
      ) : null}
      {state === "AVAILABLE" ? (
        <Button disabled={pending} onClick={() => participate()} type="button">
          Je participe
        </Button>
      ) : null}
      {confirmed && confirmation ? (
        <Button disabled={pending} onClick={() => cancel()} type="button">
          Annuler ma participation
        </Button>
      ) : null}
    </section>
  )
}
