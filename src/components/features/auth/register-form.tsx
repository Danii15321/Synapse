"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Fragment, useState, type FormEvent } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginUser, registerUser } from "@/lib/api"
import type { RegisterInput } from "@/lib/validators/auth"
import { registerSchema } from "@/lib/validators/auth"

export default function RegisterForm() {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const {
    formState: { errors },
    handleSubmit,
    register,
    trigger,
  } = useForm<RegisterInput>({
    defaultValues: { professionalLevel: "ELEVE" },
    resolver: zodResolver(registerSchema),
  })

  async function continueToProfile(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setError("")
    if (await trigger(["email", "password"])) setStep(2)
  }

  const submit = handleSubmit(async (input) => {
    if (pending) {
      return
    }
    setPending(true)
    setError("")
    try {
      await registerUser(input)
      await loginUser({ email: input.email, password: input.password })
      window.location.replace("/compte")
    } catch {
      setError("Inscription impossible. Réessayez dans un instant.")
      await new Promise((resolve) => setTimeout(resolve, 350))
    } finally {
      setPending(false)
    }
  })

  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={step === 1 ? continueToProfile : submit}
    >
      {step === 1 ? (
        <Fragment key="credentials-step">
          <div className="field-stack">
            <label className="field-label" htmlFor="register-email">
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
          <div className="field-stack">
            <label className="field-label" htmlFor="register-password">
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
            <p className="helper-text" id="password-help">
              Utilisez au moins 12 caractères.
            </p>
          </div>
        </Fragment>
      ) : (
        <Fragment key="profile-step">
          <div className="field-stack">
            <label className="field-label" htmlFor="register-first-name">
              Prénom
            </label>
            <Input
              aria-invalid={Boolean(errors.firstName)}
              autoComplete="given-name"
              id="register-first-name"
              {...register("firstName")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="register-last-name">
              Nom
            </label>
            <Input
              aria-invalid={Boolean(errors.lastName)}
              autoComplete="family-name"
              id="register-last-name"
              {...register("lastName")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="register-phone">
              Téléphone
            </label>
            <Input
              aria-invalid={Boolean(errors.phone)}
              autoComplete="tel"
              id="register-phone"
              inputMode="tel"
              {...register("phone")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="register-city">
              Ville
            </label>
            <Input
              aria-invalid={Boolean(errors.city)}
              autoComplete="address-level2"
              id="register-city"
              {...register("city")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="register-country">
              Pays
            </label>
            <Input
              aria-invalid={Boolean(errors.country)}
              autoComplete="country-name"
              id="register-country"
              {...register("country")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="register-level">
              Niveau professionnel
            </label>
            <select
              aria-invalid={Boolean(errors.professionalLevel)}
              className="ui-input"
              id="register-level"
              {...register("professionalLevel")}
            >
              <option value="ELEVE">Élève</option>
              <option value="ETUDIANT">Étudiant</option>
              <option value="DIPLOME">Diplômé</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
        </Fragment>
      )}
      {(error || Object.keys(errors).length > 0) && (
        <p className="form-message" role="alert">
          {error || "Vérifiez les informations saisies."}
        </p>
      )}
      <Button
        className="form-submit"
        disabled={pending}
        isLoading={pending}
        loadingLabel="Créer mon compte…"
        type="submit"
      >
        {step === 1 ? "Continuer" : "Créer mon compte"}
      </Button>
    </form>
  )
}
