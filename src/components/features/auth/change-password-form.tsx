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
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) })
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
    <form className="space-y-5" noValidate onSubmit={submit}>
      <div className="space-y-2">
        <label className="block font-medium" htmlFor="current-password">
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
      <div className="space-y-2">
        <label className="block font-medium" htmlFor="new-password">
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
        <p aria-live="polite" className="text-sm" role="alert">
          {message || "Vérifiez les mots de passe saisis."}
        </p>
        )}
      <Button className="min-h-touch w-full" disabled={pending} type="submit">
        {pending ? "Modification…" : "Changer le mot de passe"}
      </Button>
    </form>
  )
}
