"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { changePassword } from "@/lib/api"
import type { ChangePasswordInput } from "@/lib/validators/auth"
import { changePasswordSchema } from "@/lib/validators/auth"

type ChangePasswordFormProps = Readonly<{
  action?: (formData: FormData) => Promise<unknown>
  successful?: boolean
}>

function missingAction(): Promise<never> {
  return Promise.reject(new Error("Action de changement indisponible"))
}

export default function ChangePasswordForm({
  action,
  successful = false,
}: ChangePasswordFormProps) {
  const [message, setMessage] = useState("")
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })
  const pending = isSubmitting

  const submit = handleSubmit(async (input) => {
    setMessage("")
    try {
      await changePassword(action ?? missingAction, input)
      reset()
      setMessage("Mot de passe modifié avec succès.")
    } catch {
      setMessage("Le mot de passe n'a pas pu être modifié.")
    }
  })

  return (
    <form className="form-stack" noValidate onSubmit={submit}>
      <div className="field-stack">
        <label className="field-label" htmlFor="current-password">
          Ancien mot de passe
        </label>
        <Input
          aria-invalid={Boolean(errors.currentPassword)}
          autoComplete="current-password"
          id="current-password"
          type="password"
          {...register("currentPassword")}
        />
      </div>
      <div className="field-stack">
        <label className="field-label" htmlFor="new-password">
          Nouveau mot de passe
        </label>
        <Input
          aria-invalid={Boolean(errors.newPassword)}
          autoComplete="new-password"
          id="new-password"
          type="password"
          {...register("newPassword")}
        />
      </div>
      {!successful &&
        (message || errors.currentPassword || errors.newPassword) && (
          <p aria-live="polite" className="form-message" role="alert">
            {message || "Vérifiez les mots de passe saisis."}
          </p>
        )}
      <Button
        className="form-submit"
        disabled={pending}
        isLoading={pending}
        loadingLabel="Modification…"
        type="submit"
      >
        Changer le mot de passe
      </Button>
    </form>
  )
}
