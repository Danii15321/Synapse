"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginUser, registerUser } from "@/lib/api"
import type { RegisterInput } from "@/lib/validators/auth"
import { registerSchema } from "@/lib/validators/auth"

export default function RegisterForm() {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const submit = handleSubmit(async (input) => {
    if (pending) {
      return
    }
    setPending(true)
    setError("")
    try {
      await registerUser(input)
      await loginUser(input)
      window.location.replace("/compte")
    } catch {
      setError("Inscription impossible. Réessayez dans un instant.")
      await new Promise((resolve) => setTimeout(resolve, 350))
    } finally {
      setPending(false)
    }
  })

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <div className="space-y-2">
        <label className="block font-medium" htmlFor="register-email">
          E-mail
        </label>
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="register-email"
          type="email"
          {...register("email")}
        />
      </div>
      <div className="space-y-2">
        <label className="block font-medium" htmlFor="register-password">
          Mot de passe
        </label>
        <Input
          aria-describedby="password-help"
          aria-invalid={Boolean(errors.password)}
          autoComplete="new-password"
          id="register-password"
          type="password"
          {...register("password")}
        />
        <p className="text-sm text-foreground/70" id="password-help">
          Utilisez au moins 12 caractères.
        </p>
      </div>
      {(error || errors.email || errors.password) && (
        <p className="text-sm text-error" role="alert">
          {error || "Vérifiez les informations saisies."}
        </p>
      )}
      <Button className="min-h-touch w-full" disabled={pending} type="submit">
        {pending ? "Créer mon compte…" : "Créer mon compte"}
      </Button>
    </form>
  )
}
