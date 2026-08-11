import { afterEach, describe, expect, it, vi } from "vitest"

type RegisterRouteModule = {
  POST: (request: Request) => Promise<Response> | Response
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

function isRegisterRouteModule(value: unknown): value is RegisterRouteModule {
  return isRecord(value) && typeof value.POST === "function"
}

async function loadRegisterRoute(): Promise<RegisterRouteModule> {
  const module: unknown = await vi.importActual("@/app/api/auth/register/route")
  if (!isRegisterRouteModule(module)) {
    throw new Error("POST /api/auth/register doit exporter POST")
  }
  return module
}

function registerRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    method: "POST",
  })
}

const COMPLETE_REGISTRATION = {
  city: "Abidjan",
  country: "Côte d'Ivoire",
  email: "nouveau@example.test",
  firstName: "Awa",
  lastName: "Kouassi",
  password: "MotDePasse!2026",
  phone: "+2250701020304",
  professionalLevel: "ETUDIANT",
} as const

describe("Route Handler d'inscription", () => {
  afterEach(() => {
    vi.doUnmock("@/server/services/auth-service")
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it(
    scenario(
      "POST /api/auth/register accepte une inscription valide sans exposer le mot de passe",
      "un JSON strict contenant les deux étapes complètes et un mot de passe de 12 caractères ou plus",
      "le Route Handler valide puis délègue l'inscription au service",
      "la réponse HTTP brute est un succès JSON générique et ne contient ni password, ni passwordHash, ni le secret soumis",
    ),
    async () => {
      const password = "MotDePasse!2026"
      const registerUser = vi.fn().mockResolvedValue({
        email: "nouveau@example.test",
        id: "user-1",
        membership: "FREE",
      })
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()

      const response = await route.POST(
        registerRequest({ ...COMPLETE_REGISTRATION, password }),
      )
      const rawBody = await response.text()

      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(300)
      expect(response.headers.get("content-type")).toMatch(
        /^application\/json\b/i,
      )
      expect(registerUser).toHaveBeenCalledWith({
        ...COMPLETE_REGISTRATION,
        password,
      })
      expect(rawBody).not.toContain(password)
      expect(rawBody).not.toMatch(/passwordHash|"password"/i)
    },
  )

  it(
    scenario(
      "POST /api/auth/register ne crée rien avant un profil complet et valide",
      "une étape 1 seule, un profil au téléphone local, un niveau inconnu puis une inscription complète",
      "les quatre JSON sont envoyés directement sans validation navigateur",
      "les trois charges incomplètes ou invalides valent 400, tandis que seule la charge complète atteint le service avec le niveau strict",
    ),
    async () => {
      const registerUser = vi.fn().mockResolvedValue({ id: "user-created" })
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()

      const stepOneOnly = await route.POST(
        registerRequest({
          email: COMPLETE_REGISTRATION.email,
          password: COMPLETE_REGISTRATION.password,
        }),
      )
      const localPhone = await route.POST(
        registerRequest({
          ...COMPLETE_REGISTRATION,
          phone: "0701020304",
        }),
      )
      const unknownLevel = await route.POST(
        registerRequest({
          ...COMPLETE_REGISTRATION,
          professionalLevel: "CADRE",
        }),
      )
      const complete = await route.POST(registerRequest(COMPLETE_REGISTRATION))

      expect(stepOneOnly.status).toBe(400)
      expect(localPhone.status).toBe(400)
      expect(unknownLevel.status).toBe(400)
      expect(complete.status).toBe(201)
      expect(registerUser).toHaveBeenCalledOnce()
      expect(registerUser).toHaveBeenCalledWith(COMPLETE_REGISTRATION)
    },
  )

  it(
    scenario(
      "POST /api/auth/register refuse côté serveur un mot de passe de moins de 12 caractères",
      "un JSON d'inscription bien formé avec un secret de 11 caractères",
      "le Route Handler reçoit la requête sans aucune validation client préalable",
      "la réponse HTTP brute vaut 400 avec un JSON générique et le service d'inscription n'est jamais appelé",
    ),
    async () => {
      const registerUser = vi.fn()
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()

      const response = await route.POST(
        registerRequest({
          ...COMPLETE_REGISTRATION,
          email: "faible@example.test",
          password: "12345678901",
        }),
      )
      const rawBody = await response.text()

      expect(response.status).toBe(400)
      expect(registerUser).not.toHaveBeenCalled()
      expect(rawBody).not.toContain("12345678901")
      expect(rawBody).not.toMatch(/Zod|stack|passwordHash/i)
    },
  )

  it(
    scenario(
      "POST /api/auth/register rejette tout champ inconnu avec un schéma Zod strict",
      "un JSON autrement valide qui ajoute membership PREMIUM et userId forgé",
      "le Route Handler parse l'entrée",
      "la réponse HTTP brute vaut 400 et le service ne reçoit aucune donnée contrôlée par l'attaquant",
    ),
    async () => {
      const registerUser = vi.fn()
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()

      const response = await route.POST(
        registerRequest({
          ...COMPLETE_REGISTRATION,
          email: "forgee@example.test",
          membership: "PREMIUM",
          userId: "victime",
        }),
      )

      expect(response.status).toBe(400)
      expect(registerUser).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "POST /api/auth/register refuse une mutation d'origine étrangère",
      "un JSON valide envoyé avec un header Origin extérieur au site",
      "le Route Handler reçoit directement la mutation CSRF",
      "la réponse HTTP brute vaut 403 et le service d'inscription n'est jamais appelé",
    ),
    async () => {
      const registerUser = vi.fn()
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()
      const request = registerRequest({
        ...COMPLETE_REGISTRATION,
        email: "csrf@example.test",
      })
      request.headers.set("origin", "https://attaquant.example")

      const response = await route.POST(request)

      expect(response.status).toBe(403)
      expect(registerUser).not.toHaveBeenCalled()
    },
  )

  it(
    scenario(
      "L'inscription ne révèle pas si une adresse existe déjà",
      "deux requêtes identiques, dont le service traite l'une comme nouvelle et l'autre comme déjà existante",
      "POST /api/auth/register répond aux deux appels",
      "le statut, les headers publics et le corps HTTP brut sont strictement identiques et aucun détail de conflit n'apparaît",
    ),
    async () => {
      const registerUser = vi
        .fn()
        .mockResolvedValueOnce({ id: "user-created" })
        .mockRejectedValueOnce(
          Object.assign(new Error("email already exists"), {
            name: "AccountAlreadyExistsError",
          }),
        )
      vi.doMock("@/server/services/auth-service", () => ({ registerUser }))
      const route = await loadRegisterRoute()
      const body = {
        ...COMPLETE_REGISTRATION,
        email: "meme-adresse@example.test",
      }

      const created = await route.POST(registerRequest(body))
      const existing = await route.POST(registerRequest(body))
      const createdRaw = await created.text()
      const existingRaw = await existing.text()

      expect(existing.status).toBe(created.status)
      expect(existing.headers.get("content-type")).toBe(
        created.headers.get("content-type"),
      )
      expect(existingRaw).toBe(createdRaw)
      expect(existingRaw).not.toMatch(/already|exist|duplicate|unique|Prisma/i)
    },
  )

  it(
    scenario(
      "Un mot de passe n'apparaît jamais dans la réponse ni dans les journaux serveur",
      "une inscription dont le service lève une erreur interne contenant accidentellement le secret soumis",
      "le Route Handler produit sa réponse d'erreur et son log structuré",
      "ni le corps HTTP brut, ni stdout, ni stderr ne contiennent le secret, password ou passwordHash",
    ),
    async () => {
      const password = "UltraSecret!2026"
      vi.doMock("@/server/services/auth-service", () => ({
        registerUser: vi
          .fn()
          .mockRejectedValue(new Error(`failure password=${password}`)),
      }))
      const stdout = vi
        .spyOn(process.stdout, "write")
        .mockImplementation(() => true)
      const stderr = vi
        .spyOn(process.stderr, "write")
        .mockImplementation(() => true)
      const route = await loadRegisterRoute()

      const response = await route.POST(
        registerRequest({
          ...COMPLETE_REGISTRATION,
          email: "log@example.test",
          password,
        }),
      )
      const rawBody = await response.text()
      const logs = [...stdout.mock.calls, ...stderr.mock.calls]
        .map(([chunk]) => String(chunk))
        .join("")

      expect(response.status).toBe(500)
      for (const forbidden of [password, "password=", "passwordHash"]) {
        expect(rawBody).not.toContain(forbidden)
        expect(logs).not.toContain(forbidden)
      }
    },
  )
})
