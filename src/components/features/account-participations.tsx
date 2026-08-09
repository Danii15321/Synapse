"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cancelFormationParticipation, cancelJeuParticipation } from "@/lib/api"
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
}: Readonly<{ initialItems: ParticipationItem[] }>) {
  const [items, setItems] = useState(initialItems)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  async function cancel(item: ParticipationItem): Promise<void> {
    const key = `${item.activityType}:${item.slug}`
    if (pendingKey) return
    setPendingKey(key)
    try {
      if (item.activityType === "JEU") {
        await cancelJeuParticipation(item.slug)
      } else {
        await cancelFormationParticipation(item.slug)
      }
      setItems((current) => current.filter((entry) => entry !== item))
    } finally {
      setPendingKey(null)
    }
  }

  if (items.length === 0) {
    return <p className="empty-state">Aucune participation enregistrée.</p>
  }

  return (
    <div className="participation-list">
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
              disabled={pendingKey !== null}
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
