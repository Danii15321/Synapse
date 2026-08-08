import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main(): Promise<void> {
  await db.prompt.upsert({
    where: { slug: "trouver-une-idee-de-business" },
    update: {
      body: "Agis comme un mentor entrepreneurial. Pose-moi cinq questions sur mes compétences, mes contraintes et les problèmes que j'observe, puis propose trois idées de business adaptées avec un premier plan d'action sur sept jours.",
      excerpt:
        "Une méthode guidée qui part de tes compétences et de problèmes réels pour faire émerger des idées adaptées, puis choisir une première action concrète.",
      tags: ["business", "idée", "ia"],
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
      visibility: "PREMIUM",
    },
    create: {
      body: "Agis comme un mentor entrepreneurial. Pose-moi cinq questions sur mes compétences, mes contraintes et les problèmes que j'observe, puis propose trois idées de business adaptées avec un premier plan d'action sur sept jours.",
      excerpt:
        "Une méthode guidée qui part de tes compétences et de problèmes réels pour faire émerger des idées adaptées, puis choisir une première action concrète.",
      slug: "trouver-une-idee-de-business",
      tags: ["business", "idée", "ia"],
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
      visibility: "PREMIUM",
    },
  })

  await db.prompt.upsert({
    where: { slug: "preparer-un-entretien" },
    update: {
      body: "Aide-moi à préparer un entretien pour le poste que je vais décrire. Construis dix questions probables, puis aide-moi à formuler des réponses courtes avec la méthode situation, tâche, action et résultat.",
      excerpt:
        "Prépare les questions les plus probables et transforme tes expériences en réponses structurées, faciles à retenir et naturelles à l'oral.",
      tags: ["emploi", "entretien"],
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
      visibility: "FREE",
    },
    create: {
      body: "Aide-moi à préparer un entretien pour le poste que je vais décrire. Construis dix questions probables, puis aide-moi à formuler des réponses courtes avec la méthode situation, tâche, action et résultat.",
      excerpt:
        "Prépare les questions les plus probables et transforme tes expériences en réponses structurées, faciles à retenir et naturelles à l'oral.",
      slug: "preparer-un-entretien",
      tags: ["emploi", "entretien"],
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
      visibility: "FREE",
    },
  })
}

void main().finally(async () => {
  await db.$disconnect()
})
