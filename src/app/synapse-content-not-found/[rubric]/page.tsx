import type { Metadata } from "next"
import { headers } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"

import {
  contentRubricSchema,
  type ContentRubric,
} from "@/lib/validators/content-detail-path"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Contenu introuvable",
}

const CONTENT: Record<
  ContentRubric,
  Readonly<{ heading: string; message: string; returnLabel: string }>
> = {
  formations: {
    heading: "Formation introuvable",
    message: "Cette formation n’existe pas ou n’est plus disponible.",
    returnLabel: "Retour aux formations",
  },
  jeux: {
    heading: "Concours introuvable",
    message: "Ce jeu ou concours n’existe pas ou n’est plus disponible.",
    returnLabel: "Retour aux jeux",
  },
  opportunites: {
    heading: "Opportunité introuvable",
    message: "Cette opportunité n’existe pas ou n’est plus disponible.",
    returnLabel: "Retour aux opportunités",
  },
  prompts: {
    heading: "Prompt introuvable",
    message: "Ce prompt n’existe pas ou n’est plus disponible.",
    returnLabel: "Retour aux prompts",
  },
}

export default async function ContextualContentNotFound({
  params,
}: Readonly<{ params: Promise<{ rubric: string }> }>) {
  const requestHeaders = await headers()
  const parsedRubric = contentRubricSchema.safeParse((await params).rubric)
  if (
    requestHeaders.get("x-synapse-contextual-not-found") !== "1" ||
    !parsedRubric.success
  ) {
    notFound()
  }

  const content = CONTENT[parsedRubric.data]
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card message-card">
        <h1 className="page-heading">{content.heading}</h1>
        <p className="message-copy">{content.message}</p>
        <Link className="inline-link" href={`/${parsedRubric.data}`}>
          {content.returnLabel}
        </Link>
      </section>
    </main>
  )
}
