import { afterEach, describe, expect, it, vi } from "vitest"

type RegisterUser = (input: {
  email: string
  password: string
}) => Promise<unknown>

type ChangePassword = (input: {
  currentPassword: string
  currentSessionToken: string
  newPassword: string
  userId: string
}) => Promise<unknown>

type AuthServiceModule = {
  changePassword: ChangePassword
  registerUser: RegisterUser
}

type CredentialsModule = {
  authorizeCredentials: (input: {
    email: string
    password: string
  }) => Promise<unknown>
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

function isAuthServiceModule(value: unknown): value is AuthServiceModule {
  return (
    isRecord(value) &&
    typeof value.registerUser === "function" &&
    typeof value.changePassword === "function"
  )
}

function isCredentialsModule(value: unknown): value is CredentialsModule {
  return isRecord(value) && typeof value.authorizeCredentials === "function"
}

async function loadAuthService(): Promise<AuthServiceModule> {
  const module: unknown = await vi.importActual(
    "@/server/services/auth-service",
  )
  if (!isAuthServiceModule(module)) {
    throw new Error("auth-service doit exposer registerUser et changePassword")
  }
  return module
}

async function loadCredentials(): Promise<CredentialsModule> {
  const module: unknown = await vi.importActual("@/server/auth/credentials")
  if (!isCredentialsModule(module)) {
    throw new Error("server/auth/credentials doit exposer authorizeCredentials")
  }
  return module
}

describe("service d'inscription", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/password")
    vi.doUnmock("@/server/repositories/user-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "L'inscription transmet uniquement un hash argon2id au repository",
      "une adresse nouvelle et un mot de passe valide en clair à la frontière du service",
      "l'inscription est exécutée avec le module argon2id et le repository observés",
      "le secret en clair n'atteint jamais le repository et le résultat public ne contient ni password ni passwordHash",
    ),
    async () => {
      const password = "MotDePasse!2026"
      const passwordHash = "$argon2id$v=19$m=65536,t=3,p=4$sel$hash"
      const hashPassword = vi.fn().mockResolvedValue(passwordHash)
      const createCredentialsUser = vi.fn().mockResolvedValue({
        email: "nouveau@example.test",
        emailVerified: null,
        id: "user-1",
        membership: "FREE",
      })
      vi.doMock("@/server/auth/password", () => ({
        hashPassword,
        verifyPassword: vi.fn(),
      }))
      vi.doMock("@/server/repositories/user-repository", () => ({
        createCredentialsUser,
      }))
      const service = await loadAuthService()

      const result = await service.registerUser({
        email: "nouveau@example.test",
        password,
      })

      expect(hashPassword).toHaveBeenCalledWith(password)
      expect(createCredentialsUser).toHaveBeenCalledWith({
        email: "nouveau@example.test",
        passwordHash,
      })
      expect(JSON.stringify(result)).not.toContain(password)
      expect(JSON.stringify(result)).not.toContain("passwordHash")
    },
  )
})

describe("provider Credentials sans énumération", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/password")
    vi.doUnmock("@/server/repositories/user-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Une adresse inconnue et un mauvais mot de passe paient le même coût argon2id",
      "une tentative sur un compte existant puis une tentative sur une adresse absente",
      "Credentials refuse les deux authentifications",
      "les deux résultats valent null et chaque chemin effectue exactement une vérification contre un hash argon2id, sans branche rapide pour l'adresse absente",
    ),
    async () => {
      const existingHash = "$argon2id$v=19$m=65536,t=3,p=4$known$hash"
      const findCredentialsUserByEmail = vi
        .fn()
        .mockResolvedValueOnce({
          email: "connue@example.test",
          emailVerified: null,
          id: "user-1",
          membership: "FREE",
          passwordHash: existingHash,
        })
        .mockResolvedValueOnce(null)
      const verifyPassword = vi.fn().mockResolvedValue(false)
      vi.doMock("@/server/repositories/user-repository", () => ({
        findCredentialsUserByEmail,
      }))
      vi.doMock("@/server/auth/password", () => ({
        hashPassword: vi.fn(),
        verifyPassword,
      }))
      const credentials = await loadCredentials()

      const wrong = await credentials.authorizeCredentials({
        email: "connue@example.test",
        password: "Mauvais!2026xx",
      })
      const unknown = await credentials.authorizeCredentials({
        email: "absente@example.test",
        password: "Mauvais!2026xx",
      })

      expect(wrong).toBeNull()
      expect(unknown).toBeNull()
      expect(verifyPassword).toHaveBeenCalledTimes(2)
      expect(verifyPassword.mock.calls[0]?.[0]).toBe(existingHash)
      expect(verifyPassword.mock.calls[1]?.[0]).toMatch(/^\$argon2id\$/)
    },
  )

  it(
    scenario(
      "Credentials retourne une identité de session minimale quand le secret est correct",
      "un compte FREE existant avec un hash argon2id et une vérification positive",
      "le provider Credentials autorise la connexion",
      "l'identité contient exactement id, email et membership, sans passwordHash ni donnée d'adapter",
    ),
    async () => {
      vi.doMock("@/server/repositories/user-repository", () => ({
        findCredentialsUserByEmail: vi.fn().mockResolvedValue({
          email: "membre@example.test",
          emailVerified: null,
          id: "user-1",
          membership: "FREE",
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$known$hash",
        }),
      }))
      vi.doMock("@/server/auth/password", () => ({
        hashPassword: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(true),
      }))
      const credentials = await loadCredentials()

      const result = await credentials.authorizeCredentials({
        email: "membre@example.test",
        password: "MotDePasse!2026",
      })

      expect(result).toEqual({
        email: "membre@example.test",
        id: "user-1",
        membership: "FREE",
      })
      expect(JSON.stringify(result)).not.toContain("passwordHash")
    },
  )
})

describe("changement de mot de passe", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/password")
    vi.doUnmock("@/server/repositories/user-repository")
    vi.resetModules()
  })

  it(
    scenario(
      "Un ancien mot de passe erroné refuse toute écriture et toute rotation de session",
      "un utilisateur authentifié dont le hash courant ne correspond pas à l'ancien mot de passe fourni",
      "il demande un changement vers un nouveau mot de passe valide",
      "le service lève InvalidCurrentPasswordError et le repository ne modifie ni hash ni session",
    ),
    async () => {
      const replacePasswordAndSessions = vi.fn()
      vi.doMock("@/server/repositories/user-repository", () => ({
        findCredentialsUserById: vi.fn().mockResolvedValue({
          id: "user-1",
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$old$hash",
        }),
        replacePasswordAndSessions,
      }))
      vi.doMock("@/server/auth/password", () => ({
        hashPassword: vi.fn(),
        verifyPassword: vi.fn().mockResolvedValue(false),
      }))
      const service = await loadAuthService()

      await expect(
        service.changePassword({
          currentPassword: "AncienFaux!2026",
          currentSessionToken: "session-current",
          newPassword: "NouveauSecret!2026",
          userId: "user-1",
        }),
      ).rejects.toMatchObject({ name: "InvalidCurrentPasswordError" })
      expect(replacePasswordAndSessions).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "Un changement réussi remplace le hash, invalide les autres sessions et fait tourner la session courante",
      "un utilisateur authentifié avec un ancien mot de passe correct et une session courante identifiée",
      "il choisit un nouveau mot de passe valide",
      "le repository reçoit le nouveau hash argon2id et l'ancien token, puis le service retourne un token de session différent",
    ),
    async () => {
      const newHash = "$argon2id$v=19$m=65536,t=3,p=4$new$hash"
      const replacePasswordAndSessions = vi.fn().mockResolvedValue({
        sessionToken: "session-rotated",
      })
      vi.doMock("@/server/repositories/user-repository", () => ({
        findCredentialsUserById: vi.fn().mockResolvedValue({
          id: "user-1",
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$old$hash",
        }),
        replacePasswordAndSessions,
      }))
      vi.doMock("@/server/auth/password", () => ({
        hashPassword: vi.fn().mockResolvedValue(newHash),
        verifyPassword: vi.fn().mockResolvedValue(true),
      }))
      const service = await loadAuthService()

      const result = await service.changePassword({
        currentPassword: "AncienSecret!2026",
        currentSessionToken: "session-current",
        newPassword: "NouveauSecret!2026",
        userId: "user-1",
      })

      expect(replacePasswordAndSessions).toHaveBeenCalledWith({
        currentSessionToken: "session-current",
        passwordHash: newHash,
        userId: "user-1",
      })
      expect(result).toEqual({ sessionToken: "session-rotated" })
      expect(result).not.toEqual({ sessionToken: "session-current" })
    },
  )
})
