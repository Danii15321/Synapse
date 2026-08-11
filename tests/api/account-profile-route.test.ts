import { afterEach, describe, expect, it, vi } from "vitest"

type AccountRoute = Readonly<{
  DELETE: (request: Request) => Promise<Response> | Response
  GET: (request: Request) => Promise<Response> | Response
  PATCH: (request: Request) => Promise<Response> | Response
}>

const USER = {
  email: "member@example.test",
  id: "member-1",
  membership: "FREE",
} as const

const PROFILE = {
  city: "Abidjan",
  country: "Côte d'Ivoire",
  email: "awa@example.test",
  firstName: "Awa",
  lastName: "Kouassi",
  phone: "+2250701020304",
  professionalLevel: "ETUDIANT",
} as const

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

function isAccountRoute(value: unknown): value is AccountRoute {
  return (
    isRecord(value) &&
    typeof value.GET === "function" &&
    typeof value.PATCH === "function" &&
    typeof value.DELETE === "function"
  )
}

async function loadRoute(): Promise<AccountRoute> {
  const module: unknown = await vi.importActual("@/app/api/auth/account/route")
  if (!isAccountRoute(module)) {
    throw new Error("/api/auth/account doit exporter GET, PATCH et DELETE")
  }
  return module
}

function mutationRequest(method: "DELETE" | "PATCH", body: unknown): Request {
  return new Request("http://localhost/api/auth/account", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    method,
  })
}

function genericMessage(raw: string): string | undefined {
  const parsed: unknown = JSON.parse(raw)
  return isRecord(parsed) && typeof parsed.message === "string"
    ? parsed.message
    : undefined
}

afterEach(() => {
  vi.doUnmock("@/server/auth/require-user")
  vi.doUnmock("@/server/auth/request-security")
  vi.doUnmock("@/server/services/auth-service")
  vi.restoreAllMocks()
  vi.resetModules()
})

describe("lecture et mutations protégées du profil", () => {
  it(
    scenario(
      "GET /api/auth/account retourne strictement le profil public du compte courant",
      "un membre authentifié dont la session contient seulement l'identité minimale",
      "le Route Handler reçoit directement GET sans middleware ni identifiant client",
      "getAccount reçoit seulement user.id et le JSON brut contient exactement id, email, membership et les six champs de profil sans name, hash, session ni timestamp",
    ),
    async () => {
      const account = { ...PROFILE, id: USER.id, membership: USER.membership }
      const requireUser = vi.fn().mockResolvedValue(USER)
      const getAccount = vi.fn().mockResolvedValue(account)
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/services/auth-service", () => ({ getAccount }))
      const route = await loadRoute()

      const response = await route.GET(
        new Request(
          "http://localhost/api/auth/account?userId=victim&include=passwordHash",
        ),
      )
      const raw = await response.text()
      const parsed: unknown = JSON.parse(raw)

      expect(response.status).toBe(200)
      expect(requireUser).toHaveBeenCalledOnce()
      expect(getAccount).toHaveBeenCalledWith(USER.id)
      expect(getAccount).toHaveBeenCalledOnce()
      expect(parsed).toEqual(account)
      if (!isRecord(parsed)) {
        throw new Error("GET /api/auth/account doit retourner un objet JSON")
      }
      expect(Object.keys(parsed).sort()).toEqual(
        [
          "city",
          "country",
          "email",
          "firstName",
          "id",
          "lastName",
          "membership",
          "phone",
          "professionalLevel",
        ].sort(),
      )
      expect(raw).not.toMatch(/passwordHash|session|createdAt|updatedAt/iu)
      expect(parsed).not.toHaveProperty("name")
    },
  )

  it(
    scenario(
      "GET /api/auth/account refuse une lecture directe sans session",
      "une requête qui forge userId dans l'URL mais aucune session Auth.js",
      "le Route Handler est appelé directement sans middleware",
      "la réponse vaut 401, getAccount n'est jamais appelé et aucun détail d'authentification ne fuite",
    ),
    async () => {
      const getAccount = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockRejectedValue(
          Object.assign(new Error("session absente"), {
            name: "UnauthorizedError",
          }),
        ),
      }))
      vi.doMock("@/server/services/auth-service", () => ({ getAccount }))
      const route = await loadRoute()

      const response = await route.GET(
        new Request("http://localhost/api/auth/account?userId=victim"),
      )
      const raw = await response.text()

      expect(response.status).toBe(401)
      expect(getAccount).not.toHaveBeenCalled()
      expect(raw).not.toMatch(/session absente|victim|stack|Prisma/iu)
    },
  )

  it(
    scenario(
      "PATCH /api/auth/account normalise et sauvegarde un profil public complet",
      "un membre authentifié, une origine valide et sept champs dont un e-mail avec espaces et majuscules",
      "le Route Handler reçoit directement PATCH sans passer par le middleware",
      "la sécurité sensible est appliquée, le service reçoit userId de session et un profil normalisé, puis le JSON brut contient exactement le profil public",
    ),
    async () => {
      const requireUser = vi.fn().mockResolvedValue(USER)
      const enforceAuthMutationSecurity = vi.fn().mockResolvedValue(undefined)
      const updateProfile = vi.fn().mockResolvedValue(PROFILE)
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity,
      }))
      vi.doMock("@/server/services/auth-service", () => ({ updateProfile }))
      const route = await loadRoute()

      const response = await route.PATCH(
        mutationRequest("PATCH", {
          ...PROFILE,
          email: "  AWA@EXAMPLE.TEST ",
        }),
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(enforceAuthMutationSecurity).toHaveBeenCalledWith(
        expect.any(Request),
        "/api/auth/account",
      )
      expect(requireUser).toHaveBeenCalledOnce()
      expect(updateProfile).toHaveBeenCalledWith({
        profile: PROFILE,
        userId: USER.id,
      })
      expect(JSON.parse(raw)).toEqual(PROFILE)
      expect(raw).not.toMatch(/password|session|membership/i)
    },
  )

  it(
    scenario(
      "PATCH et DELETE rejettent les champs forgés et les profils invalides",
      "un PATCH avec userId victime, un téléphone local, un niveau inconnu et un DELETE enrichi d'un e-mail",
      "les bodies stricts sont parsés à la frontière HTTP",
      "chaque réponse vaut 400 et aucun service ne reçoit les données contrôlées par l'attaquant",
    ),
    async () => {
      const updateProfile = vi.fn()
      const deleteAccount = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(USER),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/auth-service", () => ({
        deleteAccount,
        updateProfile,
      }))
      const route = await loadRoute()

      const responses = await Promise.all([
        route.PATCH(mutationRequest("PATCH", { ...PROFILE, userId: "victim" })),
        route.PATCH(mutationRequest("PATCH", { ...PROFILE, phone: "0701" })),
        route.PATCH(
          mutationRequest("PATCH", {
            ...PROFILE,
            professionalLevel: "CADRE",
          }),
        ),
        route.DELETE(
          mutationRequest("DELETE", {
            currentPassword: "MotDePasse!2026",
            email: "victim@example.test",
          }),
        ),
      ])

      expect(responses.map((response) => response.status)).toEqual([
        400, 400, 400, 400,
      ])
      expect(updateProfile).not.toHaveBeenCalled()
      expect(deleteAccount).not.toHaveBeenCalled()
    },
  )

  it.each(["PATCH", "DELETE"] as const)(
    scenario(
      "%s /api/auth/account refuse un appel direct sans session",
      "une mutation avec origine valide mais aucune session Auth.js",
      "le Route Handler est invoqué comme une fonction sans middleware",
      "la réponse brute vaut 401, le service n'est jamais appelé et aucun détail de session ne fuite",
    ),
    async (method) => {
      const updateProfile = vi.fn()
      const deleteAccount = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockRejectedValue(
          Object.assign(new Error("session absente"), {
            name: "UnauthorizedError",
          }),
        ),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/auth-service", () => ({
        deleteAccount,
        updateProfile,
      }))
      const route = await loadRoute()
      const response =
        method === "PATCH"
          ? await route.PATCH(mutationRequest("PATCH", PROFILE))
          : await route.DELETE(
              mutationRequest("DELETE", {
                currentPassword: "MotDePasse!2026",
              }),
            )
      const raw = await response.text()

      expect(response.status).toBe(401)
      expect(updateProfile).not.toHaveBeenCalled()
      expect(deleteAccount).not.toHaveBeenCalled()
      expect(raw).not.toMatch(/session absente|stack|Prisma/i)
    },
  )

  it.each(["PATCH", "DELETE"] as const)(
    scenario(
      "%s /api/auth/account bloque une origine étrangère avant toute donnée métier",
      "une mutation authentifiée dont la protection origine/rate limit sensible lève UnauthorizedError",
      "le Route Handler reçoit la requête forgée",
      "la réponse vaut 403 et aucun service de profil ou suppression n'est exécuté",
    ),
    async (method) => {
      const updateProfile = vi.fn()
      const deleteAccount = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(USER),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockRejectedValue(
          Object.assign(new Error("origine étrangère"), {
            name: "UnauthorizedError",
          }),
        ),
      }))
      vi.doMock("@/server/services/auth-service", () => ({
        deleteAccount,
        updateProfile,
      }))
      const route = await loadRoute()
      const response =
        method === "PATCH"
          ? await route.PATCH(mutationRequest("PATCH", PROFILE))
          : await route.DELETE(
              mutationRequest("DELETE", {
                currentPassword: "MotDePasse!2026",
              }),
            )

      expect(response.status).toBe(403)
      expect(updateProfile).not.toHaveBeenCalled()
      expect(deleteAccount).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "DELETE /api/auth/account supprime le compte et expire le cookie de session",
      "un membre authentifié, son mot de passe actuel et une origine valide",
      "le Route Handler délègue la suppression vérifiée au service",
      "le service ne reçoit que currentPassword et userId de session, la réponse vaut 200 avec le message générique exact et Set-Cookie porte Max-Age=0",
    ),
    async () => {
      const enforceAuthMutationSecurity = vi.fn().mockResolvedValue(undefined)
      const deleteAccount = vi.fn().mockResolvedValue(undefined)
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(USER),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity,
      }))
      vi.doMock("@/server/services/auth-service", () => ({ deleteAccount }))
      const route = await loadRoute()

      const response = await route.DELETE(
        mutationRequest("DELETE", {
          currentPassword: "MotDePasse!2026",
        }),
      )
      const raw = await response.text()

      expect(response.status).toBe(200)
      expect(deleteAccount).toHaveBeenCalledWith({
        currentPassword: "MotDePasse!2026",
        userId: USER.id,
      })
      expect(JSON.parse(raw)).toEqual({ message: "Compte supprimé." })
      expect(response.headers.get("set-cookie")).toMatch(
        /session-token=.*Max-Age=0/iu,
      )
      expect(raw).not.toContain("MotDePasse!2026")
    },
  )

  it(
    scenario(
      "Un mauvais mot de passe ou un conflit e-mail produit la même erreur publique sans donnée personnelle",
      "un DELETE au secret erroné puis un PATCH vers une adresse déjà utilisée, avec des erreurs internes explicites",
      "les deux mutations sont journalisées par le Route Handler",
      "leurs messages publics restent génériques et ni secret, e-mail, téléphone, message Prisma ni donnée personnelle n'apparaît dans les réponses ou logs",
    ),
    async () => {
      const password = "MauvaisSecret!2026"
      const updateProfile = vi.fn().mockRejectedValue(
        Object.assign(new Error(`P2002 ${PROFILE.email}`), {
          name: "AccountAlreadyExistsError",
        }),
      )
      const deleteAccount = vi.fn().mockRejectedValue(
        Object.assign(new Error(`incorrect ${password}`), {
          name: "InvalidCurrentPasswordError",
        }),
      )
      vi.doMock("@/server/auth/require-user", () => ({
        requireUser: vi.fn().mockResolvedValue(USER),
      }))
      vi.doMock("@/server/auth/request-security", () => ({
        enforceAuthMutationSecurity: vi.fn().mockResolvedValue(undefined),
      }))
      vi.doMock("@/server/services/auth-service", () => ({
        deleteAccount,
        updateProfile,
      }))
      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true)
      const stderr = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true)
      const route = await loadRoute()

      const wrongPassword = await route.DELETE(
        mutationRequest("DELETE", { currentPassword: password }),
      )
      const conflict = await route.PATCH(mutationRequest("PATCH", PROFILE))
      const wrongRaw = await wrongPassword.text()
      const conflictRaw = await conflict.text()
      const logs = [...stdout.mock.calls, ...stderr.mock.calls]
        .map(([chunk]) => String(chunk))
        .join("")

      expect(wrongPassword.status).toBeGreaterThanOrEqual(400)
      expect(conflict.status).toBeGreaterThanOrEqual(400)
      expect(genericMessage(wrongRaw)).toBe(genericMessage(conflictRaw))
      for (const forbidden of [
        password,
        PROFILE.email,
        PROFILE.phone,
        "P2002",
        "passwordHash",
        "Prisma",
      ]) {
        expect(`${wrongRaw}\n${conflictRaw}\n${logs}`).not.toContain(forbidden)
      }
    },
  )
})
