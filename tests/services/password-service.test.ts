import { afterEach, describe, expect, it, vi } from "vitest"

type PasswordModule = {
  hashPassword: (password: string) => Promise<string>
  verifyPassword: (hash: string, password: string) => Promise<boolean>
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

function isPasswordModule(value: unknown): value is PasswordModule {
  return (
    isRecord(value) &&
    typeof value.hashPassword === "function" &&
    typeof value.verifyPassword === "function"
  )
}

async function loadPasswordModule(): Promise<PasswordModule> {
  const module: unknown = await vi.importActual("@/server/auth/password")
  if (!isPasswordModule(module)) {
    throw new Error(
      "server/auth/password doit exposer hashPassword et verifyPassword",
    )
  }
  return module
}

describe("mots de passe Credentials", () => {
  afterEach(() => {
    vi.resetModules()
  })

  it(
    scenario(
      "Les mots de passe sont hachés et vérifiés exclusivement avec argon2id",
      "un mot de passe valide de 12 caractères qui n'a jamais été persisté",
      "le module de mot de passe le hache puis vérifie une valeur correcte et une valeur erronée",
      "le hash porte le marqueur argon2id, le bon mot de passe est accepté et le mauvais refusé sans jamais renvoyer le secret",
    ),
    async () => {
      const passwords = await loadPasswordModule()
      const password = "MotDePasse!2026"

      const hash = await passwords.hashPassword(password)
      const valid = await passwords.verifyPassword(hash, password)
      const invalid = await passwords.verifyPassword(hash, "Erreur!2026xx")

      expect(hash).toMatch(/^\$argon2id\$/)
      expect(hash).not.toContain(password)
      expect(valid).toBe(true)
      expect(invalid).toBe(false)
    },
  )
})
