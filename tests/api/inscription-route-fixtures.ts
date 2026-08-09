import { expect } from "vitest"

import { isRecord } from "../repositories/jeux-inscriptions-fixtures"

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export function expectGenericApiError(raw: string): Record<string, unknown> {
  const payload: unknown = JSON.parse(raw)
  if (!isRecord(payload)) {
    throw new Error("la réponse d'erreur doit être un objet JSON")
  }
  expect(Object.keys(payload).sort()).toEqual(["errorId", "message"])
  expect(payload.errorId).toMatch(UUID_V4_PATTERN)
  expect(payload.message).toEqual(expect.any(String))
  expect(raw).not.toMatch(/Prisma|stack|DATABASE_URL|postgresql:\/\//i)
  return payload
}
