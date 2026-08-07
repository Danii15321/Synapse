import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main(): Promise<void> {
  await db.prompt.upsert({
    where: { slug: "trouver-une-idee-de-business" },
    update: {
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
    },
    create: {
      slug: "trouver-une-idee-de-business",
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
    },
  })

  await db.prompt.upsert({
    where: { slug: "preparer-un-entretien" },
    update: {
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
    },
    create: {
      slug: "preparer-un-entretien",
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
    },
  })
}

void main().finally(async () => {
  await db.$disconnect()
})
