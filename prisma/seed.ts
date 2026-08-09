import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main(): Promise<void> {
  await db.prompt.upsert({
    where: { slug: "trouver-une-idee-de-business" },
    update: {
      body: "Agis comme un mentor entrepreneurial. Pose-moi cinq questions sur mes compétences, mes contraintes et les problèmes que j'observe, puis propose trois idées de business adaptées avec un premier plan d'action sur sept jours.",
      coverImage: null,
      domain: "entrepreneuriat",
      excerpt:
        "Une méthode guidée qui part de tes compétences et de problèmes réels pour faire émerger des idées adaptées, puis choisir une première action concrète.",
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
      tags: ["business", "idee", "ia"],
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
      visibility: "PREMIUM",
    },
    create: {
      body: "Agis comme un mentor entrepreneurial. Pose-moi cinq questions sur mes compétences, mes contraintes et les problèmes que j'observe, puis propose trois idées de business adaptées avec un premier plan d'action sur sept jours.",
      coverImage: null,
      domain: "entrepreneuriat",
      excerpt:
        "Une méthode guidée qui part de tes compétences et de problèmes réels pour faire émerger des idées adaptées, puis choisir une première action concrète.",
      slug: "trouver-une-idee-de-business",
      publishedAt: new Date("2026-08-01T00:00:00.000Z"),
      tags: ["business", "idee", "ia"],
      title: "Trouver une idée de business",
      summary: "Clarifier une idée de projet adaptée à ses objectifs.",
      visibility: "PREMIUM",
    },
  })

  await db.prompt.upsert({
    where: { slug: "preparer-un-entretien" },
    update: {
      body: "Aide-moi à préparer un entretien pour le poste que je vais décrire. Construis dix questions probables, puis aide-moi à formuler des réponses courtes avec la méthode situation, tâche, action et résultat.",
      coverImage: null,
      domain: "communication",
      excerpt:
        "Prépare les questions les plus probables et transforme tes expériences en réponses structurées, faciles à retenir et naturelles à l'oral.",
      tags: ["emploi", "entretien"],
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
      publishedAt: new Date("2026-08-02T00:00:00.000Z"),
      visibility: "FREE",
    },
    create: {
      body: "Aide-moi à préparer un entretien pour le poste que je vais décrire. Construis dix questions probables, puis aide-moi à formuler des réponses courtes avec la méthode situation, tâche, action et résultat.",
      coverImage: null,
      domain: "communication",
      excerpt:
        "Prépare les questions les plus probables et transforme tes expériences en réponses structurées, faciles à retenir et naturelles à l'oral.",
      slug: "preparer-un-entretien",
      tags: ["emploi", "entretien"],
      title: "Préparer un entretien",
      summary:
        "Structurer des réponses claires pour un entretien professionnel.",
      publishedAt: new Date("2026-08-02T00:00:00.000Z"),
      visibility: "FREE",
    },
  })

  await db.formation.upsert({
    where: { slug: "maitriser-son-budget" },
    update: {
      body: "Cette formation vous guide pour cartographier vos revenus et vos dépenses, fixer une capacité d'épargne réaliste, puis construire un rituel hebdomadaire de suivi. Des exercices concrets permettent d'adapter la méthode aux revenus irréguliers.",
      coverImage: null,
      durationH: 3,
      excerpt:
        "Identifiez vos dépenses essentielles et choisissez une méthode de suivi réaliste.",
      format: "EN_LIGNE",
      kind: "PERMANENTE",
      level: "DEBUTANT",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      startsAt: null,
      summary: "Construire un budget simple et durable adapté à ses revenus.",
      title: "Maîtriser son budget au quotidien",
      visibility: "FREE",
    },
    create: {
      body: "Cette formation vous guide pour cartographier vos revenus et vos dépenses, fixer une capacité d'épargne réaliste, puis construire un rituel hebdomadaire de suivi. Des exercices concrets permettent d'adapter la méthode aux revenus irréguliers.",
      coverImage: null,
      durationH: 3,
      excerpt:
        "Identifiez vos dépenses essentielles et choisissez une méthode de suivi réaliste.",
      format: "EN_LIGNE",
      kind: "PERMANENTE",
      level: "DEBUTANT",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      slug: "maitriser-son-budget",
      startsAt: null,
      summary: "Construire un budget simple et durable adapté à ses revenus.",
      title: "Maîtriser son budget au quotidien",
      visibility: "FREE",
    },
  })

  await db.formation.upsert({
    where: { slug: "atelier-pitch-investisseur" },
    update: {
      body: "L'atelier alterne diagnostic du projet, construction d'une narration courte, clarification des chiffres clés et simulations face à un jury. Chaque participant repart avec une version structurée de son pitch et une liste d'améliorations prioritaires.",
      coverImage: null,
      durationH: 5,
      excerpt:
        "Découvrez la structure du pitch et les critères observés avant d'accéder au programme complet.",
      format: "HYBRIDE",
      kind: "EVENEMENTIELLE",
      level: "AVANCE",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      startsAt: new Date("2026-12-12T10:00:00.000Z"),
      summary:
        "Préparer et présenter un projet convaincant en quelques minutes.",
      title: "Atelier pitch investisseur",
      visibility: "PREMIUM",
    },
    create: {
      body: "L'atelier alterne diagnostic du projet, construction d'une narration courte, clarification des chiffres clés et simulations face à un jury. Chaque participant repart avec une version structurée de son pitch et une liste d'améliorations prioritaires.",
      coverImage: null,
      durationH: 5,
      excerpt:
        "Découvrez la structure du pitch et les critères observés avant d'accéder au programme complet.",
      format: "HYBRIDE",
      kind: "EVENEMENTIELLE",
      level: "AVANCE",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      slug: "atelier-pitch-investisseur",
      startsAt: new Date("2026-12-12T10:00:00.000Z"),
      summary:
        "Préparer et présenter un projet convaincant en quelques minutes.",
      title: "Atelier pitch investisseur",
      visibility: "PREMIUM",
    },
  })

  await db.opportunite.upsert({
    where: { slug: "stage-communication-jeunes" },
    update: {
      body: "Le stage permet de contribuer au calendrier éditorial, de préparer des formats courts et d'analyser leur réception. Le dossier attendu comprend un CV, une courte motivation et deux exemples de contenus personnels.",
      coverImage: null,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      excerpt:
        "Une première expérience encadrée pour développer rédaction, création et organisation.",
      externalUrl: "https://example.org/stage-communication",
      organisme: "Synapse",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      summary:
        "Participer à la production de contenus utiles à la jeunesse ivoirienne.",
      title: "Stage en communication pour les jeunes",
      type: "STAGE",
      visibility: "FREE",
    },
    create: {
      body: "Le stage permet de contribuer au calendrier éditorial, de préparer des formats courts et d'analyser leur réception. Le dossier attendu comprend un CV, une courte motivation et deux exemples de contenus personnels.",
      coverImage: null,
      deadline: new Date("2026-12-31T23:59:59.000Z"),
      excerpt:
        "Une première expérience encadrée pour développer rédaction, création et organisation.",
      externalUrl: "https://example.org/stage-communication",
      organisme: "Synapse",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      slug: "stage-communication-jeunes",
      summary:
        "Participer à la production de contenus utiles à la jeunesse ivoirienne.",
      title: "Stage en communication pour les jeunes",
      type: "STAGE",
      visibility: "FREE",
    },
  })

  await db.opportunite.upsert({
    where: { slug: "fonds-amorcage-projets" },
    update: {
      body: "Le programme accompagne des projets en phase d'amorçage qui démontrent un besoin clair, une équipe disponible et un impact mesurable. Le contenu complet présente les critères, les pièces demandées et une méthode de préparation du budget.",
      coverImage: null,
      deadline: new Date("2027-02-15T17:00:00.000Z"),
      excerpt:
        "Vérifiez l'adéquation de votre projet et préparez les éléments essentiels du dossier.",
      externalUrl: "https://example.org/fonds-amorcage",
      organisme: "Initiative Jeunesse CI",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      summary:
        "Financer une première preuve de concept portée par une équipe ivoirienne.",
      title: "Fonds d'amorçage pour projets à impact",
      type: "FINANCEMENT",
      visibility: "PREMIUM",
    },
    create: {
      body: "Le programme accompagne des projets en phase d'amorçage qui démontrent un besoin clair, une équipe disponible et un impact mesurable. Le contenu complet présente les critères, les pièces demandées et une méthode de préparation du budget.",
      coverImage: null,
      deadline: new Date("2027-02-15T17:00:00.000Z"),
      excerpt:
        "Vérifiez l'adéquation de votre projet et préparez les éléments essentiels du dossier.",
      externalUrl: "https://example.org/fonds-amorcage",
      organisme: "Initiative Jeunesse CI",
      publishedAt: new Date("2026-08-08T00:00:00.000Z"),
      slug: "fonds-amorcage-projets",
      summary:
        "Financer une première preuve de concept portée par une équipe ivoirienne.",
      title: "Fonds d'amorçage pour projets à impact",
      type: "FINANCEMENT",
      visibility: "PREMIUM",
    },
  })

  await db.jeu.upsert({
    where: { slug: "challenge-idee-impact" },
    update: {
      body: "Formez une équipe de deux à quatre personnes, choisissez un problème concret rencontré par les jeunes de votre quartier et préparez une solution testable. La présentation finale dure cinq minutes et doit expliquer le besoin, la proposition, les bénéficiaires et la première expérimentation.",
      capacity: 40,
      closesAt: new Date("2026-11-30T23:59:59.000Z"),
      coverImage: null,
      excerpt:
        "Un défi collectif pour transformer un problème local en première solution testable.",
      location: "Abidjan, Cocody",
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
      startsAt: new Date("2026-12-05T09:00:00.000Z"),
      summary:
        "Imaginer et présenter une solution utile pour les jeunes de son quartier.",
      title: "Challenge idée à impact",
      visibility: "FREE",
    },
    create: {
      body: "Formez une équipe de deux à quatre personnes, choisissez un problème concret rencontré par les jeunes de votre quartier et préparez une solution testable. La présentation finale dure cinq minutes et doit expliquer le besoin, la proposition, les bénéficiaires et la première expérimentation.",
      capacity: 40,
      closesAt: new Date("2026-11-30T23:59:59.000Z"),
      coverImage: null,
      excerpt:
        "Un défi collectif pour transformer un problème local en première solution testable.",
      location: "Abidjan, Cocody",
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
      slug: "challenge-idee-impact",
      startsAt: new Date("2026-12-05T09:00:00.000Z"),
      summary:
        "Imaginer et présenter une solution utile pour les jeunes de son quartier.",
      title: "Challenge idée à impact",
      visibility: "FREE",
    },
  })

  await db.jeu.upsert({
    where: { slug: "concours-pitch-premium" },
    update: {
      body: "Préparez un pitch de trois minutes présentant votre projet, le problème traité, la solution, les premiers résultats et votre prochaine étape. Les membres du jury évaluent la clarté, la connaissance du besoin, la faisabilité et la capacité à convaincre sans jargon.",
      capacity: 20,
      closesAt: new Date("2026-12-10T23:59:59.000Z"),
      coverImage: null,
      excerpt:
        "Découvrez les critères du jury et vérifiez que votre projet est prêt pour un pitch court.",
      location: "En ligne",
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
      startsAt: new Date("2026-12-15T15:00:00.000Z"),
      summary:
        "Présenter son projet à un jury et recevoir un retour structuré.",
      title: "Concours pitch des membres",
      visibility: "PREMIUM",
    },
    create: {
      body: "Préparez un pitch de trois minutes présentant votre projet, le problème traité, la solution, les premiers résultats et votre prochaine étape. Les membres du jury évaluent la clarté, la connaissance du besoin, la faisabilité et la capacité à convaincre sans jargon.",
      capacity: 20,
      closesAt: new Date("2026-12-10T23:59:59.000Z"),
      coverImage: null,
      excerpt:
        "Découvrez les critères du jury et vérifiez que votre projet est prêt pour un pitch court.",
      location: "En ligne",
      publishedAt: new Date("2026-08-09T00:00:00.000Z"),
      slug: "concours-pitch-premium",
      startsAt: new Date("2026-12-15T15:00:00.000Z"),
      summary:
        "Présenter son projet à un jury et recevoir un retour structuré.",
      title: "Concours pitch des membres",
      visibility: "PREMIUM",
    },
  })
}

void main().finally(async () => {
  await db.$disconnect()
})
