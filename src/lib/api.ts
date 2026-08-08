import type {
  PromptCatalogPage,
  PromptListQuery,
} from "@/lib/validators/prompt"
import { promptCatalogPageSchema } from "@/lib/validators/prompt"
import type {
  FormationCatalogPage,
  FormationListQuery,
} from "@/lib/validators/formation"
import { formationCatalogPageSchema } from "@/lib/validators/formation"
import type {
  OpportuniteCatalogPage,
  OpportuniteListQuery,
} from "@/lib/validators/opportunite"
import { opportuniteCatalogPageSchema } from "@/lib/validators/opportunite"
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "@/lib/validators/auth"
import { authMessageSchema } from "@/lib/validators/auth"

export async function getPrompts(
  query: PromptListQuery = { take: 24 },
): Promise<PromptCatalogPage> {
  const searchParams = new URLSearchParams()
  if (query.cursor) searchParams.set("cursor", query.cursor)
  if (query.domain) searchParams.set("domain", query.domain)
  if (query.search) searchParams.set("search", query.search)
  if (query.tag) searchParams.set("tag", query.tag)
  if (query.take !== 24) {
    searchParams.set("take", String(query.take))
  }
  const queryString = searchParams.toString()
  const response = queryString
    ? await fetch(`/api/prompts?${queryString}`)
    : await fetch("/api/prompts")

  if (!response.ok) {
    throw new Error("Impossible de charger les prompts.")
  }

  const payload: unknown = await response.json()

  return promptCatalogPageSchema.parse(payload)
}

export async function getFormations(
  query: FormationListQuery = { take: 24 },
): Promise<FormationCatalogPage> {
  const searchParams = new URLSearchParams()
  if (query.cursor) searchParams.set("cursor", query.cursor)
  if (query.kind) searchParams.set("kind", query.kind)
  if (query.level) searchParams.set("level", query.level)
  if (query.search) searchParams.set("search", query.search)
  if (query.take !== 24) searchParams.set("take", String(query.take))
  const queryString = searchParams.toString()
  const response = await fetch(
    queryString ? `/api/formations?${queryString}` : "/api/formations",
  )
  if (!response.ok) throw new Error("Impossible de charger les formations.")

  const payload: unknown = await response.json()
  return formationCatalogPageSchema.parse(payload)
}

export async function getOpportunites(
  query: OpportuniteListQuery = { take: 24 },
): Promise<OpportuniteCatalogPage> {
  const searchParams = new URLSearchParams()
  if (query.cursor) searchParams.set("cursor", query.cursor)
  if (query.search) searchParams.set("search", query.search)
  if (query.type) searchParams.set("type", query.type)
  if (query.take !== 24) searchParams.set("take", String(query.take))
  const queryString = searchParams.toString()
  const response = await fetch(
    queryString ? `/api/opportunites?${queryString}` : "/api/opportunites",
  )
  if (!response.ok) throw new Error("Impossible de charger les opportunités.")

  const payload: unknown = await response.json()
  return opportuniteCatalogPageSchema.parse(payload)
}

async function postAuthJson(pathname: string, input: unknown) {
  const response = await fetch(pathname, {
    body: JSON.stringify(input),
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  const payload: unknown = await response.json()

  if (!response.ok) {
    throw new Error("La demande n'a pas pu être traitée.")
  }

  return authMessageSchema.parse(payload)
}

export function registerUser(input: RegisterInput) {
  return postAuthJson("/api/auth/register", input)
}

export function loginUser(input: LoginInput) {
  return postAuthJson("/api/auth/callback/credentials", input)
}

export function changePassword(
  action: (formData: FormData) => Promise<unknown>,
  input: ChangePasswordInput,
) {
  const formData = new FormData()
  formData.set("currentPassword", input.currentPassword)
  formData.set("newPassword", input.newPassword)
  return action(formData)
}
