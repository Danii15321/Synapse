import { afterEach, describe, expect, it, vi } from "vitest"

type ChangePasswordActionModule = {
  changePasswordAction: (formData: FormData) => Promise<unknown>
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

function isChangePasswordActionModule(
  value: unknown,
): value is ChangePasswordActionModule {
  return isRecord(value) && typeof value.changePasswordAction === "function"
}

async function loadAction(): Promise<ChangePasswordActionModule> {
  const module: unknown = await vi.importActual(
    "@/app/(member)/compte/change-password-action",
  )
  if (!isChangePasswordActionModule(module)) {
    throw new Error(
      "le compte doit exporter changePasswordAction depuis sa Server Action",
    )
  }
  return module
}

describe("Server Action de changement de mot de passe", () => {
  afterEach(() => {
    vi.doUnmock("@/server/auth/require-user")
    vi.doUnmock("@/server/services/auth-service")
    vi.resetModules()
  })

  it(
    scenario(
      "L'action protégée refuse un appel direct qui contourne le middleware",
      "un attaquant sans session appelle directement la Server Action avec deux mots de passe valides",
      "l'action s'exécute hors du formulaire et sans passer par middleware.ts",
      "requireUser est exécuté dans l'action, UnauthorizedError remonte et le service de changement n'est jamais appelé",
    ),
    async () => {
      const requireUser = vi.fn().mockRejectedValue(
        Object.assign(new Error("unauthorized"), {
          name: "UnauthorizedError",
        }),
      )
      const changePassword = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/services/auth-service", () => ({ changePassword }))
      const action = await loadAction()
      const formData = new FormData()
      formData.set("currentPassword", "AncienSecret!2026")
      formData.set("newPassword", "NouveauSecret!2026")

      await expect(action.changePasswordAction(formData)).rejects.toMatchObject(
        { name: "UnauthorizedError" },
      )
      expect(requireUser).toHaveBeenCalledTimes(1)
      expect(changePassword).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "L'action tire toujours userId de la session et rejette un userId soumis",
      "un membre authentifié soumet aussi l'identifiant d'une victime dans le FormData",
      "la Server Action valide l'entrée avec un schéma strict",
      "l'appel est refusé avant le service et l'identifiant forgé n'est jamais utilisé",
    ),
    async () => {
      const requireUser = vi.fn().mockResolvedValue({
        email: "membre@example.test",
        id: "user-session",
        membership: "FREE",
      })
      const changePassword = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/services/auth-service", () => ({ changePassword }))
      const action = await loadAction()
      const formData = new FormData()
      formData.set("currentPassword", "AncienSecret!2026")
      formData.set("newPassword", "NouveauSecret!2026")
      formData.set("userId", "victime")

      await expect(action.changePasswordAction(formData)).rejects.toBeDefined()
      expect(changePassword).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "L'action refuse côté serveur un nouveau mot de passe de moins de 12 caractères",
      "un membre authentifié appelle directement la Server Action avec un nouveau secret de 11 caractères",
      "l'action valide le FormData sans dépendre du navigateur",
      "la validation échoue avant le service et aucun mot de passe n'est modifié",
    ),
    async () => {
      const requireUser = vi.fn().mockResolvedValue({
        email: "membre@example.test",
        id: "user-session",
        membership: "FREE",
      })
      const changePassword = vi.fn()
      vi.doMock("@/server/auth/require-user", () => ({ requireUser }))
      vi.doMock("@/server/services/auth-service", () => ({ changePassword }))
      const action = await loadAction()
      const formData = new FormData()
      formData.set("currentPassword", "AncienSecret!2026")
      formData.set("newPassword", "12345678901")

      await expect(action.changePasswordAction(formData)).rejects.toBeDefined()
      expect(changePassword).not.toHaveBeenCalled()
    },
  )
})
