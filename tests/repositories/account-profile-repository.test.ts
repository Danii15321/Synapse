import { randomUUID } from "node:crypto"

import { afterEach, describe, expect, it, vi } from "vitest"

import { db } from "@/server/db"

type ProfessionalLevel = "ELEVE" | "ETUDIANT" | "DIPLOME" | "AUTRE"

type Profile = Readonly<{
  city: string
  country: string
  email: string
  firstName: string
  lastName: string
  phone: string
  professionalLevel: ProfessionalLevel
}>

type UserRepository = Readonly<{
  createCredentialsUser: (
    input: Profile & Readonly<{ name: string; passwordHash: string }>,
  ) => Promise<unknown>
  deleteUserById: (userId: string) => Promise<unknown>
  updateUserProfile: (
    input: Profile & Readonly<{ name: string; userId: string }>,
  ) => Promise<unknown>
}>

const createdIds = new Set<string>()

const PROFILE: Profile = {
  city: "Abidjan",
  country: "Côte d'Ivoire",
  email: "awa@example.test",
  firstName: "Awa",
  lastName: "Kouassi",
  phone: "+2250701020304",
  professionalLevel: "ETUDIANT",
}

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isUserRepository(value: unknown): value is UserRepository {
  return (
    isRecord(value) &&
    typeof value.createCredentialsUser === "function" &&
    typeof value.updateUserProfile === "function" &&
    typeof value.deleteUserById === "function"
  )
}

async function loadRepository(): Promise<UserRepository> {
  const module: unknown = await vi.importActual(
    "@/server/repositories/user-repository",
  )
  if (!isUserRepository(module)) {
    throw new Error(
      "user-repository doit exposer createCredentialsUser, updateUserProfile et deleteUserById",
    )
  }
  return module
}

async function insertUser(id: string, email: string): Promise<void> {
  createdIds.add(id)
  await db.$executeRaw`
    INSERT INTO "User" (
      "id", "name", "email", "passwordHash", "membership", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, 'Compte historique', ${email},
      '$argon2id$v=19$m=65536,t=3,p=4$fixture$hash',
      'FREE'::"Membership", NOW(), NOW()
    )
  `
}

afterEach(async () => {
  if (createdIds.size > 0) {
    await db.user.deleteMany({ where: { id: { in: Array.from(createdIds) } } })
    createdIds.clear()
  }
  vi.resetModules()
})

describe("profil utilisateur sur PostgreSQL réel", () => {
  it(
    scenario(
      "La migration ajoute un profil nullable et un niveau professionnel strict",
      "une base contenant déjà des comptes historiques sans profil détaillé",
      "le catalogue PostgreSQL inspecte User et l'enum ProfessionalLevel",
      "les six nouveaux champs sont nullable et l'enum contient exactement ELEVE, ETUDIANT, DIPLOME et AUTRE",
    ),
    async () => {
      const columns = await db.$queryRaw<
        Array<{ columnName: string; nullable: string }>
      >`
        SELECT column_name AS "columnName", is_nullable AS nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'User'
          AND column_name IN (
            'firstName', 'lastName', 'phone', 'city', 'country', 'professionalLevel'
          )
        ORDER BY column_name
      `
      const levels = await db.$queryRaw<Array<{ value: string }>>`
        SELECT enumlabel AS value
        FROM pg_enum
        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
        WHERE pg_type.typname = 'ProfessionalLevel'
        ORDER BY enumsortorder
      `

      expect(columns).toHaveLength(6)
      expect(columns.every((column) => column.nullable === "YES")).toBe(true)
      expect(levels.map((level) => level.value)).toEqual([
        "ELEVE",
        "ETUDIANT",
        "DIPLOME",
        "AUTRE",
      ])
    },
  )

  it(
    scenario(
      "La création finale persiste le profil complet sans exposer le hash",
      "une adresse unique, un profil complet validé et un hash argon2id",
      "createCredentialsUser crée le nouveau compte FREE",
      "name et les champs personnels sont persistés, tandis que le DTO public ne contient ni passwordHash ni session",
    ),
    async () => {
      const repository = await loadRepository()
      const email = `profile-create-${randomUUID()}@example.test`

      const created = await repository.createCredentialsUser({
        ...PROFILE,
        email,
        name: "Awa Kouassi",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$create$hash",
      })
      if (!isRecord(created) || typeof created.id !== "string") {
        throw new Error("la création doit retourner un DTO public avec id")
      }
      createdIds.add(created.id)
      const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT "name", "email", "firstName", "lastName", "phone", "city",
               "country", "professionalLevel"::text AS "professionalLevel"
        FROM "User" WHERE "id" = ${created.id}
      `

      expect(rows).toEqual([{ ...PROFILE, email, name: "Awa Kouassi" }])
      expect(JSON.stringify(created)).not.toMatch(/passwordHash|session/i)
    },
  )

  it(
    scenario(
      "Une sauvegarde de profil ne peut modifier qu'un userId explicite",
      "deux comptes historiques et un profil complet destiné au premier",
      "updateUserProfile est filtré avec l'id du propriétaire",
      "seul le premier reçoit les valeurs publiques, le second et les memberships restent intacts",
    ),
    async () => {
      const repository = await loadRepository()
      const targetId = `profile-target-${randomUUID()}`
      const otherId = `profile-other-${randomUUID()}`
      await insertUser(targetId, `target-${randomUUID()}@example.test`)
      await insertUser(otherId, `other-${randomUUID()}@example.test`)

      const result = await repository.updateUserProfile({
        ...PROFILE,
        name: "Awa Kouassi",
        userId: targetId,
      })
      const rows = await db.$queryRaw<
        Array<{
          email: string
          firstName: string | null
          id: string
          membership: string
        }>
      >`
        SELECT "id", "email", "firstName", "membership"::text AS membership
        FROM "User" WHERE "id" IN (${targetId}, ${otherId}) ORDER BY "id"
      `

      expect(rows.find((row) => row.id === targetId)).toMatchObject({
        email: PROFILE.email,
        firstName: PROFILE.firstName,
        membership: "FREE",
      })
      expect(rows.find((row) => row.id === otherId)).toMatchObject({
        firstName: null,
        membership: "FREE",
      })
      expect(result).toEqual(PROFILE)
    },
  )

  it(
    scenario(
      "La suppression cascade les données du compte sans toucher un autre utilisateur",
      "deux utilisateurs possédant chacun une session database",
      "deleteUserById reçoit uniquement l'id de session du compte cible",
      "le compte cible et sa session disparaissent par cascade, tandis que l'autre compte et sa session subsistent",
    ),
    async () => {
      const repository = await loadRepository()
      const targetId = `delete-target-${randomUUID()}`
      const otherId = `delete-other-${randomUUID()}`
      await insertUser(targetId, `delete-target-${randomUUID()}@example.test`)
      await insertUser(otherId, `delete-other-${randomUUID()}@example.test`)
      await db.session.createMany({
        data: [targetId, otherId].map((userId) => ({
          expires: new Date("2099-01-01T00:00:00.000Z"),
          sessionToken: `session-${userId}`,
          userId,
        })),
      })

      await repository.deleteUserById(targetId)
      createdIds.delete(targetId)

      expect(await db.user.findUnique({ where: { id: targetId } })).toBeNull()
      expect(
        await db.session.findUnique({
          where: { sessionToken: `session-${targetId}` },
        }),
      ).toBeNull()
      expect(
        await db.user.findUnique({ where: { id: otherId } }),
      ).not.toBeNull()
      expect(
        await db.session.findUnique({
          where: { sessionToken: `session-${otherId}` },
        }),
      ).not.toBeNull()
    },
  )
})
