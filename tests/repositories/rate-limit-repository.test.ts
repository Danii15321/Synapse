import { randomUUID } from "node:crypto"

import { describe, expect, it, vi } from "vitest"

import { db } from "@/server/db"

type RateLimitHit = {
  count: number
  retryAfterSeconds: number
}

type RateLimitRepositoryModule = {
  purgeExpiredRateLimits: (now: Date) => Promise<number>
  recordRateLimitHit: (input: {
    identifier: string
    now: Date
    windowMs: number
  }) => Promise<RateLimitHit>
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

function isRateLimitRepositoryModule(
  value: unknown,
): value is RateLimitRepositoryModule {
  return (
    isRecord(value) &&
    typeof value.recordRateLimitHit === "function" &&
    typeof value.purgeExpiredRateLimits === "function"
  )
}

async function loadRepository(): Promise<RateLimitRepositoryModule> {
  const module: unknown = await vi.importActual(
    "@/server/repositories/rate-limit-repository",
  )

  if (!isRateLimitRepositoryModule(module)) {
    throw new Error(
      "rate-limit-repository doit exposer l'enregistrement et la purge des fenêtres",
    )
  }

  return module
}

async function expectPostgreSql(): Promise<void> {
  const rows = await db.$queryRaw<
    Array<{ version: string }>
  >`SELECT version() AS version`
  expect(rows[0]?.version).toMatch(/PostgreSQL 16/i)
}

describe("repository du rate limiting sur PostgreSQL", () => {
  it(
    scenario(
      "Le compteur persiste les hits d'une IP et ouvre une nouvelle fenêtre après une minute",
      "une vraie base PostgreSQL 16 et un identifiant IP unique sans hit",
      "deux hits sont enregistrés dans la même minute puis un troisième après l'expiration de la fenêtre",
      "les compteurs persistés valent successivement 1, 2 puis 1 et Retry-After reste strictement positif",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const identifier = `ip:${randomUUID()}`
      const now = new Date()

      const first = await repository.recordRateLimitHit({
        identifier,
        now,
        windowMs: 60_000,
      })
      const second = await repository.recordRateLimitHit({
        identifier,
        now: new Date(now.getTime() + 1_000),
        windowMs: 60_000,
      })
      const afterWindow = await repository.recordRateLimitHit({
        identifier,
        now: new Date(now.getTime() + 61_000),
        windowMs: 60_000,
      })

      expect(first.count).toBe(1)
      expect(second.count).toBe(2)
      expect(afterWindow.count).toBe(1)
      expect(first.retryAfterSeconds).toBeGreaterThan(0)
      expect(second.retryAfterSeconds).toBeGreaterThan(0)
      expect(afterWindow.retryAfterSeconds).toBeGreaterThan(0)
    },
  )

  it(
    scenario(
      "La purge supprime les fenêtres expirées sans effacer une fenêtre active",
      "une vraie base PostgreSQL 16 avec un compteur actif et un compteur expiré propres au test",
      "la purge est exécutée à l'instant courant puis les deux identifiants reçoivent un nouveau hit",
      "au moins une ligne expirée est supprimée, le compteur actif passe à 2 et l'ancien compteur repart à 1",
    ),
    async () => {
      const repository = await loadRepository()
      await expectPostgreSql()
      const activeIdentifier = `ip:${randomUUID()}`
      const expiredIdentifier = `ip:${randomUUID()}`
      const now = new Date()

      await repository.recordRateLimitHit({
        identifier: activeIdentifier,
        now,
        windowMs: 60_000,
      })
      await repository.recordRateLimitHit({
        identifier: expiredIdentifier,
        now: new Date(now.getTime() - 120_000),
        windowMs: 60_000,
      })

      const purged = await repository.purgeExpiredRateLimits(now)
      const active = await repository.recordRateLimitHit({
        identifier: activeIdentifier,
        now: new Date(now.getTime() + 1_000),
        windowMs: 60_000,
      })
      const expired = await repository.recordRateLimitHit({
        identifier: expiredIdentifier,
        now,
        windowMs: 60_000,
      })

      expect(purged).toBeGreaterThan(0)
      expect(active.count).toBe(2)
      expect(expired.count).toBe(1)
    },
  )
})
