"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import ChangePasswordForm from "@/components/features/auth/change-password-form"
import SessionRotationReload from "@/components/features/auth/session-rotation-reload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteAccount } from "@/lib/api"
import {
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@/lib/validators/auth"

type AccountPrivacyProps = Readonly<{
  changePasswordAction: (formData: FormData) => Promise<unknown>
  passwordChanged: string | string[] | undefined
}>

export default function AccountPrivacy({
  changePasswordAction,
  passwordChanged,
}: AccountPrivacyProps) {
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState("")
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
  })

  const submitDeletion = handleSubmit(async (input) => {
    setDeleteMessage("")
    try {
      await deleteAccount(input)
      window.location.replace("/")
    } catch {
      setDeleteMessage("La demande n'a pas pu être traitée.")
    }
  })

  return (
    <div className="account-privacy-stack">
      <section className="account-section ui-card">
        <h2 className="section-heading">Mot de passe</h2>
        {passwordChanged === "rotating" ? <SessionRotationReload /> : null}
        {passwordChanged === "1" ? (
          <p className="form-message account-success" role="status">
            Mot de passe modifié avec succès.
          </p>
        ) : null}
        <Button
          aria-expanded={passwordOpen}
          onClick={() => setPasswordOpen((open) => !open)}
          type="button"
        >
          {passwordOpen ? "Fermer le formulaire" : "Changer le mot de passe"}
        </Button>
        {passwordOpen ? (
          <ChangePasswordForm
            action={changePasswordAction}
            successful={passwordChanged === "rotating" || passwordChanged === "1"}
          />
        ) : null}
      </section>
      <section className="account-section account-danger ui-card">
        <h2 className="section-heading">Zone de danger</h2>
        <p className="section-intro">
          La suppression du compte est définitive et efface vos sessions.
        </p>
        <form className="form-stack" noValidate onSubmit={submitDeletion}>
          <div className="field-stack">
            <label className="field-label" htmlFor="delete-current-password">
              Mot de passe actuel
            </label>
            <Input
              aria-invalid={Boolean(errors.currentPassword)}
              autoComplete="current-password"
              id="delete-current-password"
              type="password"
              {...register("currentPassword")}
            />
          </div>
          {deleteMessage || errors.currentPassword ? (
            <p className="form-message" role="alert">
              {deleteMessage || "Vérifiez le mot de passe saisi."}
            </p>
          ) : null}
          <Button
            className="account-delete-button"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingLabel="Suppression…"
            type="submit"
          >
            Supprimer mon compte
          </Button>
        </form>
      </section>
    </div>
  )
}
