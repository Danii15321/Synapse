"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateAccountProfile } from "@/lib/api"
import {
  accountProfileSchema,
  type AccountDto,
  type AccountProfileInput,
  type ProfessionalLevel,
} from "@/lib/validators/auth"

const LEVEL_LABELS: Record<ProfessionalLevel, string> = {
  AUTRE: "Autre",
  DIPLOME: "Diplômé",
  ELEVE: "Élève",
  ETUDIANT: "Étudiant",
}

function initialProfile(account: AccountDto): AccountProfileInput {
  return {
    city: account.city ?? "",
    country: account.country ?? "",
    email: account.email,
    firstName: account.firstName ?? "",
    lastName: account.lastName ?? "",
    phone: account.phone ?? "",
    professionalLevel: account.professionalLevel ?? "AUTRE",
  }
}

export default function AccountProfile({
  account,
}: Readonly<{ account: AccountDto }>) {
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState("")
  const [profile, setProfile] = useState(() => initialProfile(account))
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AccountProfileInput>({
    defaultValues: profile,
    resolver: zodResolver(accountProfileSchema),
  })

  const submit = handleSubmit(async (input) => {
    setMessage("")
    try {
      const updated = await updateAccountProfile(input)
      setProfile(updated)
      reset(updated)
      setEditing(false)
    } catch {
      setMessage("Le profil n'a pas pu être sauvegardé.")
    }
  })

  if (!editing) {
    return (
      <div className="account-profile-panel">
        <dl className="account-profile-grid">
          <div>
            <dt className="account-label">Prénom</dt>
            <dd className="account-value">{profile.firstName || "À compléter"}</dd>
          </div>
          <div>
            <dt className="account-label">Nom</dt>
            <dd className="account-value">{profile.lastName || "À compléter"}</dd>
          </div>
          <div>
            <dt className="account-label">E-mail</dt>
            <dd className="account-value">{profile.email}</dd>
          </div>
          <div>
            <dt className="account-label">Téléphone</dt>
            <dd className="account-value">{profile.phone || "À compléter"}</dd>
          </div>
          <div>
            <dt className="account-label">Ville</dt>
            <dd className="account-value">{profile.city || "À compléter"}</dd>
          </div>
          <div>
            <dt className="account-label">Pays</dt>
            <dd className="account-value">{profile.country || "À compléter"}</dd>
          </div>
          <div>
            <dt className="account-label">Niveau professionnel</dt>
            <dd className="account-value">
              {LEVEL_LABELS[profile.professionalLevel]}
            </dd>
          </div>
        </dl>
        <Button onClick={() => setEditing(true)} type="button">
          Modifier
        </Button>
      </div>
    )
  }

  return (
    <form className="form-stack account-profile-form" noValidate onSubmit={submit}>
      <div className="account-form-grid">
        <div className="field-stack">
          <label className="field-label" htmlFor="account-first-name">
            Prénom
          </label>
          <Input
            aria-invalid={Boolean(errors.firstName)}
            autoComplete="given-name"
            id="account-first-name"
            {...register("firstName")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-last-name">
            Nom
          </label>
          <Input
            aria-invalid={Boolean(errors.lastName)}
            autoComplete="family-name"
            id="account-last-name"
            {...register("lastName")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-email">
            E-mail
          </label>
          <Input
            aria-invalid={Boolean(errors.email)}
            autoComplete="email"
            id="account-email"
            type="email"
            {...register("email")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-phone">
            Téléphone
          </label>
          <Input
            aria-invalid={Boolean(errors.phone)}
            autoComplete="tel"
            id="account-phone"
            inputMode="tel"
            {...register("phone")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-city">
            Ville
          </label>
          <Input
            aria-invalid={Boolean(errors.city)}
            autoComplete="address-level2"
            id="account-city"
            {...register("city")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-country">
            Pays
          </label>
          <Input
            aria-invalid={Boolean(errors.country)}
            autoComplete="country-name"
            id="account-country"
            {...register("country")}
          />
        </div>
        <div className="field-stack">
          <label className="field-label" htmlFor="account-level">
            Niveau professionnel
          </label>
          <select
            aria-invalid={Boolean(errors.professionalLevel)}
            className="ui-input"
            id="account-level"
            {...register("professionalLevel")}
          >
            {Object.entries(LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {message || Object.keys(errors).length > 0 ? (
        <p className="form-message" role="alert">
          {message || "Vérifiez les informations saisies."}
        </p>
      ) : null}
      <div className="account-form-actions">
        <Button
          disabled={isSubmitting}
          isLoading={isSubmitting}
          loadingLabel="Sauvegarde…"
          type="submit"
        >
          Sauvegarder
        </Button>
        <Button
          className="account-secondary-button"
          disabled={isSubmitting}
          onClick={() => {
            reset(profile)
            setMessage("")
            setEditing(false)
          }}
          type="button"
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
