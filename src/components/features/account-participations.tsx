"use client"

import { Button } from "@/components/ui/button"
import { useAccountParticipations } from "@/hooks/use-participation"
import type { ParticipationPage } from "@/lib/validators/inscription"

type ParticipationItem = ParticipationPage["items"][number]

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function AccountParticipations({
  initialItems,
  userId,
}: Readonly<{ initialItems: ParticipationItem[]; userId: string }>) {
  const { cancel, error, items, pending } =
    useAccountParticipations(initialItems, userId)

  if (items.length === 0) {
    return <p className="empty-state">Aucune participation enregistrée.</p>
  }

  return (
    <div className="participation-list">
      {pending ? <p role="status">Annulation en cours…</p> : null}
      {error ? (
        <p className="form-message" role="alert">
          L&apos;annulation n&apos;a pas pu être effectuée. Réessayez.
        </p>
      ) : null}
      {items.map((item) => {
        const key = `${item.activityType}:${item.slug}`
        return (
          <article className="participation-item" key={key}>
            <p className="eyebrow">
              {item.activityType === "JEU" ? "Jeu ou concours" : "Formation"}
            </p>
            <h3 className="card-heading">{item.title}</h3>
            {item.startsAt ? <p>{formatDate(item.startsAt)}</p> : null}
            {item.location ? <p>{item.location}</p> : null}
            <Button
              disabled={pending}
              onClick={() => cancel(item)}
              type="button"
            >
              Annuler ma participation
            </Button>
          </article>
        )
      })}
    </div>
  )
}
