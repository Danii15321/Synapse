import { existsSync, readFileSync, readdirSync } from "node:fs"
import { extname, join, relative } from "node:path"

import { describe, expect, it } from "vitest"

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8")
}

function sourceFilesUnder(directory: string): string[] {
  const absolute = join(process.cwd(), directory)
  if (!existsSync(absolute)) {
    return []
  }
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFilesUnder(child)
    }
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : []
  })
}

function projectSourceFiles(): string[] {
  const middleware = existsSync(join(process.cwd(), "middleware.ts"))
    ? ["middleware.ts"]
    : []
  return [...sourceFilesUnder("src"), ...middleware]
}

describe("contrat architectural Auth.js", () => {
  it(
    scenario(
      "next-auth n'est importé que dans src/server/auth",
      "tous les fichiers TypeScript de l'application",
      "les imports next-auth et les points de contact Auth.js sont inventoriés",
      "au moins la configuration Auth.js importe next-auth et aucun service, repository, composant, middleware ou Route Handler ne l'importe directement",
    ),
    () => {
      const imports = projectSourceFiles().filter((path) =>
        /(?:from\s*|import\s*)["']next-auth(?:\/[^"']*)?["']/.test(
          source(path),
        ),
      )

      expect(imports.length).toBeGreaterThan(0)
      for (const path of imports) {
        expect(relative("src/server/auth", path)).not.toMatch(/^\.\./)
      }
      expect(source("src/app/api/auth/[...nextauth]/route.ts")).toMatch(
        /handlers/,
      )
    },
  )

  it(
    scenario(
      "Auth.js utilise l'adapter Prisma et une session database de 30 jours glissants",
      "la configuration serveur d'Auth.js",
      "ses options d'adapter et de session sont inspectées",
      "PrismaAdapter est configuré, strategy vaut database, maxAge vaut 2 592 000 secondes et aucune stratégie jwt n'est présente",
    ),
    () => {
      const files = sourceFilesUnder("src/server/auth")
      const authSource = files.map(source).join("\n")
      const compact = authSource.replace(/[\s_]/g, "")

      expect(authSource).toMatch(/PrismaAdapter\s*\(/)
      expect(authSource).toMatch(/strategy\s*:\s*["']database["']/)
      expect(compact).toMatch(/maxAge:(?:2592000|30\*24\*60\*60)/)
      expect(authSource).not.toMatch(/strategy\s*:\s*["']jwt["']/)
    },
  )

  it(
    scenario(
      "Le cookie de session est configuré httpOnly, Secure et SameSite=Lax",
      "la configuration serveur qui crée le cookie Auth.js",
      "les options du cookie de session sont inspectées",
      "httpOnly et secure valent true, sameSite vaut lax et aucun stockage navigateur n'est utilisé pour l'authentification",
    ),
    () => {
      const files = sourceFilesUnder("src/server/auth")
      const authSource = files.map(source).join("\n")
      const allSource = projectSourceFiles().map(source).join("\n")

      expect(authSource).toMatch(/httpOnly\s*:\s*true/)
      expect(authSource).toMatch(/secure\s*:\s*true/)
      expect(authSource).toMatch(/sameSite\s*:\s*["']lax["']/i)
      expect(allSource).not.toMatch(/localStorage|sessionStorage/)
    },
  )

  it(
    scenario(
      "La frontière Auth.js injecte le membership courant dans SessionUser",
      "une session database et un utilisateur dont le membership peut être FREE ou PREMIUM",
      "le callback session de la configuration est inspecté",
      "le callback lit le membership de l'utilisateur serveur et l'assigne à session.user sans dépendre d'un JWT",
    ),
    () => {
      const files = sourceFilesUnder("src/server/auth")
      const authSource = files.map(source).join("\n")

      expect(authSource).toMatch(/callbacks\s*:/)
      expect(authSource).toMatch(/session\s*\(/)
      expect(authSource).toMatch(/session\.user\.membership/)
      expect(authSource).not.toMatch(/\bjwt\s*\(/)
    },
  )

  it(
    scenario(
      "Les modules serveur d'auth restent isolés et les couches ne sautent pas",
      "tous les fichiers créés sous src/server/auth, services et repositories pour la tranche",
      "leurs imports et premières instructions sont inspectés",
      "chaque fichier serveur commence par server-only, les services n'importent ni next-auth ni Prisma et les handlers n'importent jamais Prisma",
    ),
    () => {
      const serverFiles = [
        ...sourceFilesUnder("src/server/auth"),
        ...sourceFilesUnder("src/server/services"),
        ...sourceFilesUnder("src/server/repositories"),
      ]
      expect(
        serverFiles.some((path) => path.startsWith("src/server/auth/")),
      ).toBe(true)

      for (const path of serverFiles) {
        expect(
          source(path).trimStart().startsWith('import "server-only"'),
        ).toBe(true)
      }
      for (const path of sourceFilesUnder("src/server/services")) {
        expect(source(path)).not.toMatch(/next-auth|@prisma\/client|server\/db/)
      }
      for (const path of sourceFilesUnder("src/app/api").filter((candidate) =>
        candidate.endsWith("route.ts"),
      )) {
        expect(source(path)).not.toMatch(/@prisma\/client|server\/db/)
      }
    },
  )

  it(
    scenario(
      "La tranche installe seulement les dépendances d'authentification prévues",
      "le manifeste npm de l'application",
      "les dépendances nécessaires au provider Credentials et aux formulaires sont lues",
      "next-auth, son Prisma Adapter, argon2, React Hook Form et le resolver Zod sont déclarés, sans bcrypt",
    ),
    () => {
      const manifest: unknown = JSON.parse(source("package.json"))
      expect(manifest).toEqual(
        expect.objectContaining({
          dependencies: expect.objectContaining({
            "@auth/prisma-adapter": expect.any(String),
            "@hookform/resolvers": expect.any(String),
            argon2: expect.any(String),
            "next-auth": expect.any(String),
            "react-hook-form": expect.any(String),
          }),
        }),
      )
      expect(source("package.json")).not.toMatch(/bcrypt/i)
    },
  )

  it(
    scenario(
      "Le changement de mot de passe applique le régime sensible de dix requêtes par minute",
      "la Server Action de compte, appelable comme un endpoint public",
      "sa défense en profondeur et son appel au rate limiting sont inspectés",
      "elle appelle requireUser et enforceRateLimit avec un pathname /api/auth/* avant toute mutation métier",
    ),
    () => {
      const action = source("src/app/(member)/compte/change-password-action.ts")
      expect(action).toMatch(/requireUser\s*\(/)
      expect(action).toMatch(/enforceRateLimit\s*\(/)
      expect(action).toMatch(/["']\/api\/auth\//)
    },
  )
})
