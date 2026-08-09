import { describe, expect, it } from "vitest"

type Schema = Readonly<{
  safeParse: (value: unknown) => Readonly<{ success: boolean }>
}>

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

function isSchema(value: unknown): value is Schema {
  return isRecord(value) && typeof value.safeParse === "function"
}

async function loadSchema(): Promise<Schema> {
  const modulePath = "@/lib/validators/premium-contact"
  const module: unknown = await import(modulePath)
  if (!isRecord(module) || !isSchema(module.premiumContactSchema)) {
    throw new Error(
      "premium-contact doit exporter premiumContactSchema comme source de vérité Zod",
    )
  }
  return module.premiumContactSchema
}

describe("validation de la demande de contact premium", () => {
  it(
    scenario(
      "Le formulaire accepte seulement les quatre champs stricts et les deux moyens arbitrés",
      "un nom complet, l'e-mail du compte, un numéro WhatsApp et Wave ou mobile money",
      "le schéma parse les demandes valides puis des charges malformées ou enrichies",
      "les deux moyens valides passent, tandis qu'un champ inconnu, une valeur vide ou démesurée, un mauvais e-mail, un faux numéro et CARD échouent",
    ),
    async () => {
      const schema = await loadSchema()
      const valid = {
        email: "awa.kouassi@example.test",
        fullName: "Awa Kouassi",
        paymentMethod: "WAVE",
        whatsappNumber: "+2250701020304",
      }

      expect(schema.safeParse(valid).success).toBe(true)
      expect(
        schema.safeParse({ ...valid, paymentMethod: "MOBILE_MONEY" }).success,
      ).toBe(true)
      expect(
        schema.safeParse({ ...valid, userId: "forged-user" }).success,
      ).toBe(false)
      expect(schema.safeParse({ ...valid, fullName: "   " }).success).toBe(
        false,
      )
      expect(
        schema.safeParse({ ...valid, fullName: "A".repeat(10_000) }).success,
      ).toBe(false)
      expect(
        schema.safeParse({ ...valid, email: "pas-un-email" }).success,
      ).toBe(false)
      expect(
        schema.safeParse({ ...valid, whatsappNumber: "numéro secret" }).success,
      ).toBe(false)
      expect(
        schema.safeParse({ ...valid, paymentMethod: "CARD" }).success,
      ).toBe(false)
    },
  )
})
