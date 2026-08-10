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
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFilesUnder(child)
    return [".ts", ".tsx"].includes(extname(entry.name)) ? [child] : []
  })
}

function writesMembership(fileSource: string): boolean {
  const prismaUserMutation =
    /\.\s*user\s*\.\s*(?:create|createMany|update|updateMany|upsert)\s*\(\s*\{[\s\S]{0,1200}\b(?:data|create|update)\s*:\s*\{[^}]*\bmembership\s*:/iu.test(
      fileSource,
    )
  const rawUserMutation =
    /(?:UPDATE\s+"?User"?[\s\S]{0,1500}\bmembership\b|INSERT\s+INTO\s+"?User"?[\s\S]{0,1500}\bmembership\b[\s\S]{0,1500}\bPREMIUM\b)/iu.test(
      fileSource,
    )
  return prismaUserMutation || rawUserMutation
}

describe("contrats d'architecture du tunnel premium", () => {
  it(
    scenario(
      "Aucune route ni Server Action publique ne peut atteindre grantPremium",
      "tous les Route Handlers, fichiers d'actions et modules use server de src/app",
      "les imports, références et appels à grantPremium sont inventoriés exhaustivement",
      "le service d'attribution existe mais aucun point d'entrée public ne l'importe, ne le réexporte ni ne l'appelle",
    ),
    () => {
      const servicePath = "src/server/services/membership-service.ts"
      expect(existsSync(join(process.cwd(), servicePath))).toBe(true)

      const publicEntrypoints = sourceFilesUnder("src/app").filter((path) => {
        const fileSource = source(path)
        return (
          /(?:^|\/)route\.tsx?$/u.test(path) ||
          /(?:^|\/)actions?(?:\/|\.)/u.test(path) ||
          /^[\s\S]*["']use server["']/u.test(fileSource)
        )
      })
      const offenders = publicEntrypoints.filter((path) =>
        /membership-service|\bgrantPremium\b/u.test(source(path)),
      )

      const allowedReferences = new Set([
        "src/server/repositories/membership-repository.ts",
        "src/server/services/membership-service.ts",
      ])
      const unexpectedApplicationReferences = sourceFilesUnder("src")
        .filter((path) =>
          /membership-service|\bgrantPremium\b/u.test(source(path)),
        )
        .filter((path) => !allowedReferences.has(path))

      expect(offenders).toEqual([])
      expect(unexpectedApplicationReferences).toEqual([])
    },
  )

  it(
    scenario(
      "grantPremium est le seul chemin d'écriture de membership et promotion plus trace sont transactionnelles",
      "tous les sources applicatifs, scripts et seeds hors migrations historiques",
      "les affectations PREMIUM et la transaction qui crée MembershipGrant sont recherchées",
      "une seule primitive repository écrit membership, elle utilise $transaction et MembershipGrant, et aucun script ou service ne contourne ce chemin",
    ),
    () => {
      const files = [
        ...sourceFilesUnder("src"),
        ...sourceFilesUnder("scripts"),
        ...sourceFilesUnder("prisma").filter(
          (path) => !path.startsWith("prisma/migrations/"),
        ),
      ]
      const mutationFiles = files.filter((path) =>
        writesMembership(source(path)),
      )

      expect(mutationFiles).toHaveLength(1)
      const mutationPath = mutationFiles[0]
      expect(mutationPath).toBeDefined()
      if (!mutationPath)
        throw new Error("une primitive d'attribution est requise")
      expect(relative("src/server/repositories", mutationPath)).not.toMatch(
        /^\.\./u,
      )
      expect(source(mutationPath)).toMatch(/\$transaction\s*\(/u)
      expect(source(mutationPath)).toMatch(/membershipGrant|MembershipGrant/u)
    },
  )

  it(
    scenario(
      "La commande d'administration appelle membershipService.grantPremium au lieu de Prisma",
      "le script grant-premium existant et la source grant-premium-cli",
      "son appel et ses imports sont inspectés",
      "le script appelle le service avec userId et source, sans PrismaClient, user.update ni SQL direct",
    ),
    () => {
      const scriptPath = "scripts/grant-premium.ts"
      const script = source(scriptPath)

      expect(script).toMatch(/membershipService\s*\.\s*grantPremium\s*\(/u)
      expect(script).toContain("grant-premium-cli")
      expect(script).not.toMatch(
        /PrismaClient|\.user\.(?:update|updateMany)|\$executeRaw/u,
      )
    },
  )

  it(
    scenario(
      "Le prix de 7 550 FCFA n'a qu'une source applicative",
      "tous les fichiers TypeScript de src",
      "chaque occurrence numérique du montant arbitré est comptée",
      "le montant 7 550 n'apparaît qu'une fois dans la source et peut être formaté par tous les écrans sans copie en dur",
    ),
    () => {
      const matches = sourceFilesUnder("src").flatMap((path) =>
        Array.from(source(path).matchAll(/7(?:_|\s|\u00a0|\u202f)?550/gu)).map(
          () => path,
        ),
      )

      expect(matches).toHaveLength(1)
    },
  )

  it(
    scenario(
      "Le point d'insertion v2 est documenté sans faux webhook exposé",
      "le document v2-paiement et tous les points d'entrée publics",
      "la signature, l'idempotence, le webhook, grantPremium et les routes implémentées sont contrôlés",
      "la couture v2 est expliquée dans docs/v2-paiement.md et aucune route de webhook ou paiement réel n'existe en v1",
    ),
    () => {
      const documentPath = "docs/v2-paiement.md"
      expect(existsSync(join(process.cwd(), documentPath))).toBe(true)
      const document = source(documentPath)
      expect(document).toMatch(/webhook/iu)
      expect(document).toMatch(/idempoten/iu)
      expect(document).toMatch(/signature/iu)
      expect(document).toMatch(/grantPremium/u)

      const forbiddenRoutes = sourceFilesUnder("src/app").filter(
        (path) =>
          /(?:webhooks?|paiements?|payments?)/iu.test(path) &&
          /(?:^|\/)route\.tsx?$/u.test(path),
      )
      expect(forbiddenRoutes).toEqual([])
    },
  )

  it(
    scenario(
      "Le contact WhatsApp reste une navigation locale sans appel à une API WhatsApp",
      "les fichiers du tunnel premium existent et peuvent contenir le lien wa.me",
      "les appels fetch et les clients HTTP visant WhatsApp sont recherchés",
      "au moins un écran premium est implémenté mais aucun appel réseau applicatif n'envoie de données à WhatsApp",
    ),
    () => {
      const premiumFiles = sourceFilesUnder("src").filter((path) =>
        /premium/iu.test(path),
      )
      expect(
        premiumFiles.some((path) => /wa\.me\/33668823012/u.test(source(path))),
      ).toBe(true)
      const outboundApiCalls = premiumFiles.filter((path) =>
        /fetch\s*\([^)]*(?:wa\.me|whatsapp)|(?:axios|ky)\s*\.\s*(?:post|get)\s*\([^)]*(?:wa\.me|whatsapp)/iu.test(
          source(path),
        ),
      )
      expect(outboundApiCalls).toEqual([])
    },
  )

  it(
    scenario(
      "Le tunnel public ne contient aucune autre primitive d'écriture",
      "la page /premium, ses composants et le service de lecture de l'offre",
      "leurs imports, Server Actions et appels Prisma ou HTTP de mutation sont inventoriés",
      "le tunnel existe mais n'appelle ni grantPremium, ni create/update/delete/upsert, ni SQL d'écriture, ni fetch inline",
    ),
    () => {
      const offerPagePath = "src/app/(public)/premium/page.tsx"
      expect(existsSync(join(process.cwd(), offerPagePath))).toBe(true)
      const tunnelFiles = sourceFilesUnder("src").filter(
        (path) =>
          path.startsWith("src/app/(public)/premium/") ||
          path.includes("premium-offer") ||
          path.includes("premium-tunnel"),
      )
      const mutators = tunnelFiles.filter((path) =>
        /\bgrantPremium\b|["']use server["']|\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(|\$(?:executeRaw|queryRawUnsafe)\b|\bfetch\s*\(/u.test(
          source(path),
        ),
      )

      expect(tunnelFiles).toContain(offerPagePath)
      expect(mutators).toEqual([])
    },
  )
})
