import { describe, expect, it, vi } from "vitest"

type ClientIdentifierModule = {
  resolveRateLimitIdentifier: (input: {
    headers: Headers
    trustedProxy: "none" | "vercel"
  }) => string
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

function isClientIdentifierModule(
  value: unknown,
): value is ClientIdentifierModule {
  return (
    isRecord(value) && typeof value.resolveRateLimitIdentifier === "function"
  )
}

async function loadResolver(): Promise<ClientIdentifierModule> {
  const module: unknown = await vi.importActual(
    "@/server/rate-limit/client-identifier",
  )
  if (!isClientIdentifierModule(module)) {
    throw new Error("client-identifier doit exposer resolveRateLimitIdentifier")
  }
  return module
}

describe("identification de l'appelant derrière le proxy", () => {
  it(
    scenario(
      "Vercel attesté transforme une IP publique unique et valide en identifiant de rate limiting",
      "le contrat Vercel explicitement activé et un X-Forwarded-For réécrit contenant une IPv4 puis une IPv6 valides",
      "le résolveur traite chaque jeu de headers",
      "les identifiants sont distincts et contiennent exactement l'IP normalisée fournie par Vercel",
    ),
    async () => {
      const resolver = await loadResolver()

      const ipv4 = resolver.resolveRateLimitIdentifier({
        headers: new Headers({ "x-forwarded-for": "203.0.113.17" }),
        trustedProxy: "vercel",
      })
      const ipv6 = resolver.resolveRateLimitIdentifier({
        headers: new Headers({ "x-forwarded-for": "2001:db8::17" }),
        trustedProxy: "vercel",
      })

      expect(ipv4).toBe("ip:203.0.113.17")
      expect(ipv6).toBe("ip:2001:db8::17")
      expect(ipv4).not.toBe(ipv6)
    },
  )

  it(
    scenario(
      "Vercel attesté rejette les valeurs X-Forwarded-For ambiguës ou invalides",
      "le contrat Vercel activé avec successivement un header absent, une chaîne de deux IP et une valeur non-IP",
      "le résolveur traite ces headers non fiables",
      "les trois appels retombent sur le même compartiment sentinelle sans recopier aucune valeur fournie",
    ),
    async () => {
      const resolver = await loadResolver()
      const headers = [
        new Headers(),
        new Headers({
          "x-forwarded-for": "203.0.113.17, 198.51.100.4",
        }),
        new Headers({ "x-forwarded-for": "not-an-ip" }),
      ]

      const identifiers = headers.map((value) =>
        resolver.resolveRateLimitIdentifier({
          headers: value,
          trustedProxy: "vercel",
        }),
      )

      expect(new Set(identifiers).size).toBe(1)
      for (const identifier of identifiers) {
        expect(identifier).not.toMatch(
          /203\.0\.113\.17|198\.51\.100\.4|not-an-ip/,
        )
      }
    },
  )

  it(
    scenario(
      "Local et CI ignorent tout X-Forwarded-For client et partagent un compartiment fail-closed",
      "aucun proxy de confiance attesté et trois clients qui falsifient des IPv4 différentes",
      "le résolveur traite les headers avec trustedProxy none",
      "les trois identifiants sont strictement identiques et ne contiennent aucune des IP falsifiées",
    ),
    async () => {
      const resolver = await loadResolver()
      const spoofedIps = ["203.0.113.1", "203.0.113.2", "203.0.113.3"]

      const identifiers = spoofedIps.map((spoofedIp) =>
        resolver.resolveRateLimitIdentifier({
          headers: new Headers({ "x-forwarded-for": spoofedIp }),
          trustedProxy: "none",
        }),
      )

      expect(new Set(identifiers).size).toBe(1)
      for (const spoofedIp of spoofedIps) {
        expect(identifiers[0]).not.toContain(spoofedIp)
      }
    },
  )
})
