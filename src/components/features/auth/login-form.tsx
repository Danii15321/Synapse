"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginUser } from "@/lib/api"
import type { LoginInput } from "@/lib/validators/auth"
import { loginSchema } from "@/lib/validators/auth"

export default function LoginForm() {
  const [error, setError] = useState("")
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const pending = isSubmitting

  const submit = handleSubmit(async (input) => {
    setError("")
    try {
      await loginUser(input)
      window.location.replace("/compte")
    } catch {
      setError("Connexion impossible. Vérifiez vos informations.")
    }
  })

  return (
    <form className="form-stack" noValidate onSubmit={submit}>
      <div className="field-stack">
        <label className="field-label" htmlFor="login-email">
          E-mail
        </label>
        <Input
          aria-invalid={Boolean(errors.email)}
          autoComplete="email"
          id="login-email"
          type="email"
          {...register("email")}
        />
      </div>
      <div className="field-stack">
        <label className="field-label" htmlFor="login-password">
          Mot de passe
        </label>
        <Input
          aria-invalid={Boolean(errors.password)}
          autoComplete="current-password"
          id="login-password"
          type="password"
          {...register("password")}
        />
      </div>
      {(error || errors.email || errors.password) && (
        <p aria-live="assertive" className="form-message">
          {error || "Saisissez une adresse e-mail et un mot de passe valides."}
        </p>
      )}
      <Button
        className="form-submit"
        disabled={pending}
        isLoading={pending}
        loadingLabel="Connexion…"
        type="submit"
      >
        Se connecter
      </Button>
    </form>
  )
}
