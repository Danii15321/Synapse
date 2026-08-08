import { afterEach, describe, expect, it, vi } from "vitest"

type RequireUserModule = {
  requireUser: () => Promise<unknown>
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

function isRequireUserModule(value: unknown): value is RequireUserModule {
  return isRecord(value) && typeof value.requireUser === "function"
}

async function loadRequireUser(auth: () => Promise<unknown>) {
  vi.doMock("@/server/auth/config", () => ({ auth }))
  const module: unknown = await vi.importActual("@/server/auth/require-user")
  if (!isRequireUserModule(module)) {
    throw new Error("server/auth/require-user doit exposer requireUser")
  }
  return module.requireUser
}

describe("garde de session serveur requireUser", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/config")
    vi.resetModules()
  })

  it(
    scenario(
      "Une session absente est refusée par requireUser",
      "Auth.js ne trouve aucun cookie de session valide",
      "le serveur demande l'utilisateur courant",
      "requireUser lève UnauthorizedError au lieu de fabriquer une identité anonyme",
    ),
    async () => {
      const requireUser = await loadRequireUser(vi.fn().mockResolvedValue(null))
      await expect(requireUser()).rejects.toMatchObject({
        name: "UnauthorizedError",
      })
    },
  )

  it(
    scenario(
      "Une session expirée est refusée par requireUser",
      "Auth.js fournit une session dont expires est antérieur à l'instant courant",
      "le serveur demande l'utilisateur courant",
      "requireUser lève UnauthorizedError et ne retourne aucune identité",
    ),
    async () => {
      const requireUser = await loadRequireUser(
        vi.fn().mockResolvedValue({
          expires: "2000-01-01T00:00:00.000Z",
          user: {
            email: "membre@example.test",
            id: "user-1",
            membership: "FREE",
          },
        }),
      )
      await expect(requireUser()).rejects.toMatchObject({
        name: "UnauthorizedError",
      })
    },
  )

  it(
    scenario(
      "Une session falsifiée est refusée par requireUser",
      "la frontière Auth.js fournit une charge dont le membership ne respecte pas le contrat SessionUser",
      "le serveur demande l'utilisateur courant",
      "requireUser lève UnauthorizedError sans propager l'identité forgée",
    ),
    async () => {
      const requireUser = await loadRequireUser(
        vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: {
            email: "attaquant@example.test",
            id: "user-forged",
            membership: "ADMIN",
          },
        }),
      )
      await expect(requireUser()).rejects.toMatchObject({
        name: "UnauthorizedError",
      })
    },
  )

  it(
    scenario(
      "Une session valide expose seulement l'identité serveur et le membership courant",
      "Auth.js fournit une session non expirée d'un membre PREMIUM",
      "le serveur demande l'utilisateur courant",
      "requireUser retourne exactement id, email et membership, sans cookie ni token",
    ),
    async () => {
      const requireUser = await loadRequireUser(
        vi.fn().mockResolvedValue({
          expires: "2099-01-01T00:00:00.000Z",
          user: {
            email: "premium@example.test",
            id: "user-1",
            membership: "PREMIUM",
          },
        }),
      )
      await expect(requireUser()).resolves.toEqual({
        email: "premium@example.test",
        id: "user-1",
        membership: "PREMIUM",
      })
    },
  )
})
