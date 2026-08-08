import type { PromptDto } from "@/lib/validators/prompt"
import { promptListSchema } from "@/lib/validators/prompt"
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "@/lib/validators/auth"
import { authMessageSchema } from "@/lib/validators/auth"

export async function getPrompts(): Promise<PromptDto[]> {
  const response = await fetch("/api/prompts")

  if (!response.ok) {
    throw new Error("Impossible de charger les prompts.")
  }

  const payload: unknown = await response.json()

  return promptListSchema.parse(payload)
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
