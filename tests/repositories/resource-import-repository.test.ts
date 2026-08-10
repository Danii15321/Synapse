import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { PrismaClient } from "@prisma/client"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest"

import {
  assertCommandSucceeded,
  createResourceProject,
  databaseClient,
  isolatedDatabaseUrl,
  insertLegacyDemoContent,
  removeResourceProject,
  resetIsolatedDatabase,
  runSeed,
  scenario,
  syntheticMarkdown,
  type ResourceProject,
} from "../fixtures/resource-import-test-utils"

const databaseUrl = isolatedDatabaseUrl("repository")
let db: PrismaClient
let project: ResourceProject

describe("import des ressources sur une vraie base PostgreSQL", () => {
  beforeAll(() => {
    const reset = resetIsolatedDatabase(databaseUrl)
    assertCommandSucceeded(reset)
    db = databaseClient(databaseUrl)
  }, 120_000)

  beforeEach(async () => {
    await db.inscription.deleteMany()
    await db.formationInscription.deleteMany()
    await db.prompt.deleteMany()
    await db.formation.deleteMany()
    await db.opportunite.deleteMany()
    await db.jeu.deleteMany()
    project = await createResourceProject()
  })

  afterEach(async () => {
    await removeResourceProject(project)
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it(
    scenario(
      "Le seed remplace les données de démonstration par exactement 69 prompts source",
      "une vraie base PostgreSQL contenant un ancien prompt absent de la source et une ligne démo Formation, Opportunité et Jeu, plus une source uppercase ressources/PROMPTS de 69 fichiers synthétiques",
      "npx prisma db seed est exécuté une fois depuis le projet de fixtures",
      "la commande réussit, l'ancien prompt est supprimé, la base contient uniquement 69 prompts source répartis 20 FREE/49 PREMIUM et zéro formation, opportunité ou jeu",
    ),
    async () => {
      await insertLegacyDemoContent(db)

      const result = runSeed(project, databaseUrl)

      const [prompts, formations, opportunites, jeux] = await Promise.all([
        db.prompt.groupBy({ by: ["visibility"], _count: { _all: true } }),
        db.formation.count(),
        db.opportunite.count(),
        db.jeu.count(),
      ])
      const totalPrompts = prompts.reduce(
        (total, entry) => total + entry._count._all,
        0,
      )
      const distribution = Object.fromEntries(
        prompts.map((entry) => [entry.visibility, entry._count._all]),
      )

      assertCommandSucceeded(result)
      expect(totalPrompts).toBe(69)
      expect(distribution).toEqual({ FREE: 20, PREMIUM: 49 })
      const slugs = await db.prompt.findMany({ select: { slug: true } })
      expect(new Set(slugs.map(({ slug }) => slug)).size).toBe(69)
      expect(
        await db.prompt.count({ where: { slug: "ancienne-demo-prompt" } }),
      ).toBe(0)
      expect({ formations, jeux, opportunites }).toEqual({
        formations: 0,
        jeux: 0,
        opportunites: 0,
      })
    },
    120_000,
  )

  it(
    scenario(
      "Seule la source uppercase ressources/PROMPTS est importée",
      "69 fichiers autorisés sous ressources/PROMPTS et un ancien exemple détaillé sous ressources/prompts",
      "npx prisma db seed parcourt les ressources éditoriales",
      "la base contient les 69 prompts autorisés et ne contient ni le slug ni la sentinelle de l'ancien exemple lowercase",
    ),
    async () => {
      const legacyDirectory = path.join(
        project.directory,
        "ressources",
        "prompts",
      )
      await mkdir(legacyDirectory, { recursive: true })
      await writeFile(
        path.join(legacyDirectory, "ancien-exemple.md"),
        syntheticMarkdown(
          "Ancien exemple interdit",
          "CORPS-LOWERCASE-INTERDIT",
        ),
        "utf8",
      )

      const result = runSeed(project, databaseUrl)

      assertCommandSucceeded(result)
      expect(await db.prompt.count()).toBe(69)
      expect(
        await db.prompt.count({
          where: {
            OR: [
              { slug: "ancien-exemple-interdit" },
              { body: { contains: "CORPS-LOWERCASE-INTERDIT" } },
            ],
          },
        }),
      ).toBe(0)
    },
    120_000,
  )

  it(
    scenario(
      "Deux exécutions consécutives donnent le même catalogue sans doublon",
      "une vraie base PostgreSQL vide et les mêmes 69 fichiers synthétiques",
      "npx prisma db seed est exécuté deux fois sans modifier la source",
      "les deux commandes réussissent et les ids, slugs, corps, métadonnées et visibilités des 69 lignes restent identiques",
    ),
    async () => {
      const first = runSeed(project, databaseUrl)
      const firstState = await db.prompt.findMany({
        orderBy: { slug: "asc" },
        select: {
          body: true,
          domain: true,
          excerpt: true,
          id: true,
          publishedAt: true,
          slug: true,
          summary: true,
          tags: true,
          title: true,
          visibility: true,
        },
      })

      const second = runSeed(project, databaseUrl)
      const secondState = await db.prompt.findMany({
        orderBy: { slug: "asc" },
        select: {
          body: true,
          domain: true,
          excerpt: true,
          id: true,
          publishedAt: true,
          slug: true,
          summary: true,
          tags: true,
          title: true,
          visibility: true,
        },
      })

      assertCommandSucceeded(first)
      assertCommandSucceeded(second)
      expect(firstState).toHaveLength(69)
      expect(secondState).toEqual(firstState)
    },
    120_000,
  )

  it(
    scenario(
      "Modifier un fichier existant met à jour sa ligne au lieu d'en créer une seconde",
      "un premier import réussi et le fichier BUSINESS Prompt 001 conservant le même nom",
      "son corps change puis npx prisma db seed est rejoué",
      "le slug business-prompt-001 existe une seule fois, garde son id et contient exactement la nouvelle sentinelle",
    ),
    async () => {
      const first = runSeed(project, databaseUrl)
      assertCommandSucceeded(first)
      const before = await db.prompt.findUnique({
        select: { id: true },
        where: { slug: "business-prompt-001" },
      })
      const sourceFile = path.join(
        project.promptsDirectory,
        "BUSINESS",
        "BUSINESS Prompt 001.md",
      )
      await writeFile(
        sourceFile,
        syntheticMarkdown(
          "BUSINESS Prompt 001",
          "CORPS-SYNTHETIQUE-MODIFIE-UNIQUE",
        ),
        "utf8",
      )

      const second = runSeed(project, databaseUrl)
      const matching = await db.prompt.findMany({
        select: { body: true, id: true, slug: true },
        where: { slug: "business-prompt-001" },
      })

      assertCommandSucceeded(second)
      expect(before).not.toBeNull()
      expect(matching).toEqual([
        {
          body: expect.stringContaining("CORPS-SYNTHETIQUE-MODIFIE-UNIQUE"),
          id: before?.id,
          slug: "business-prompt-001",
        },
      ])
      expect(await db.prompt.count()).toBe(69)
    },
    120_000,
  )

  it(
    scenario(
      "Le rapport final expose les imports, mises à jour, rejets et la répartition de chaque rubrique",
      "69 ressources Prompts valides et aucune ressource réelle dans les trois autres rubriques",
      "npx prisma db seed termine son import",
      "stdout ou stderr nomme importé, mis à jour et rejeté, puis affiche Prompts FREE 20/PREMIUM 49 et 0/0 pour Formations, Opportunités et Jeux",
    ),
    () => {
      const result = runSeed(project, databaseUrl)
      const output = result.output

      assertCommandSucceeded(result)
      expect(output).toMatch(/import(?:é|e|ed)/iu)
      expect(output).toMatch(/mis(?:e)?s? à jour|updated/iu)
      expect(output).toMatch(/rejet(?:é|e|ed)/iu)
      expect(output).toMatch(
        /prompts?[\s\S]*FREE[\s:=|-]*20[\s\S]*PREMIUM[\s:=|-]*49/iu,
      )
      for (const rubrique of ["formations?", "opportunit(?:é|e)s?", "jeux?"]) {
        expect(output).toMatch(
          new RegExp(
            `${rubrique}[\\s\\S]*FREE[\\s:=|-]*0[\\s\\S]*PREMIUM[\\s:=|-]*0`,
            "iu",
          ),
        )
      }
    },
    120_000,
  )

  it(
    scenario(
      "Une ressource rejetée fait échouer la commande avec son motif précis",
      "une source ne contenant qu'un fichier BUSINESS sans titre",
      "npx prisma db seed tente l'import sur la vraie base",
      "la commande sort en erreur et son rapport cite BUSINESS/Sans titre.md, le champ title, un rejet et son motif",
    ),
    async () => {
      await removeResourceProject(project)
      project = await createResourceProject({ BUSINESS: 0 })
      await writeFile(
        path.join(project.promptsDirectory, "BUSINESS", "Sans titre.md"),
        "### Prompt :\nCorps synthétique sans titre.\n",
        "utf8",
      )

      const result = runSeed(project, databaseUrl)

      expect(result.status, result.output).not.toBe(0)
      expect(result.output).toMatch(/BUSINESS[\\/]Sans titre\.md/iu)
      expect(result.output).toMatch(/title/iu)
      expect(result.output).toMatch(/rejet|reject/iu)
      expect(result.output).toMatch(/motif|reason|title/iu)
    },
    120_000,
  )
})
