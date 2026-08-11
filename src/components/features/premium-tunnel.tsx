"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PremiumContactInput } from "@/lib/validators/premium-contact"
import { premiumContactSchema } from "@/lib/validators/premium-contact"
import type { PremiumOffer } from "@/lib/validators/premium-offer"

const PREMIUM_WHATSAPP_URL = "https://wa.me/33668823012"

type TunnelStep = "offer" | "summary" | "contact" | "final"

type PremiumTunnelProps = Readonly<{
  accountEmail: string | null
  offer: PremiumOffer
}>

function formatPrice(price: PremiumOffer["price"]): string {
  const currency = price.currency === "XOF" ? "FCFA" : price.currency
  return `${new Intl.NumberFormat("fr-FR").format(price.amount)} ${currency}`
}

function paymentMethodLabel(
  paymentMethod: PremiumContactInput["paymentMethod"],
): string {
  return paymentMethod === "WAVE" ? "Wave" : "Mobile money"
}

function contactMessage(
  input: PremiumContactInput,
  price: PremiumOffer["price"],
): string {
  return [
    "Demande d'accès Premium Synapse",
    `Nom complet : ${input.fullName}`,
    `E-mail du compte : ${input.email}`,
    `Numéro WhatsApp : ${input.whatsappNumber}`,
    `Moyen choisi : ${paymentMethodLabel(input.paymentMethod)}`,
    `Montant : ${formatPrice(price)}`,
    "Paiement unique, accès à vie, sans abonnement.",
  ].join("\n")
}

export function PremiumTunnel({ accountEmail, offer }: PremiumTunnelProps) {
  const [step, setStep] = useState<TunnelStep>("offer")
  const [contactError, setContactError] = useState("")
  const [whatsappFrameUrl, setWhatsappFrameUrl] = useState("")
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PremiumContactInput>({
    defaultValues: {
      email: accountEmail ?? "",
      fullName: "",
      paymentMethod: "WAVE",
      whatsappNumber: "",
    },
    resolver: zodResolver(premiumContactSchema),
  })
  const formattedPrice = formatPrice(offer.price)
  const totalCount = Object.values(offer.counts).reduce(
    (total, count) => total + count,
    0,
  )

  const submitContact = handleSubmit(async (input) => {
    setContactError("")
    try {
      await navigator.clipboard.writeText(contactMessage(input, offer.price))
      setWhatsappFrameUrl(PREMIUM_WHATSAPP_URL)
      window.open(PREMIUM_WHATSAPP_URL, "_blank", "noopener,noreferrer")
      setStep("final")
    } catch {
      setContactError(
        "La copie du récapitulatif a échoué. Autorisez le presse-papiers puis réessayez.",
      )
    }
  })

  if (step === "summary") {
    return (
      <section
        aria-labelledby="summary-title"
        className="premium-panel ui-card"
      >
        <p className="eyebrow">Étape 1 sur 2</p>
        <h2 className="section-heading" id="summary-title">
          Récapitulatif
        </h2>
        <p className="premium-price">{formattedPrice}</p>
        <p className="card-copy">
          Accès Premium Synapse à vie, réglé en un paiement unique, sans
          abonnement.
        </p>
        <Button onClick={() => setStep("contact")} type="button">
          Continuer vers mes coordonnées
        </Button>
      </section>
    )
  }

  if (step === "contact") {
    return (
      <section
        aria-labelledby="contact-title"
        className="premium-panel ui-card"
      >
        <p className="eyebrow">Étape 2 sur 2</p>
        <h2 className="section-heading" id="contact-title">
          Coordonnées et moyen choisi
        </h2>
        <form className="form-stack" noValidate onSubmit={submitContact}>
          <div className="field-stack">
            <label className="field-label" htmlFor="premium-full-name">
              Nom complet
            </label>
            <Input
              aria-invalid={Boolean(errors.fullName)}
              autoComplete="name"
              id="premium-full-name"
              {...register("fullName")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="premium-email">
              E-mail du compte
            </label>
            <Input
              id="premium-email"
              readOnly
              type="email"
              {...register("email")}
            />
          </div>
          <div className="field-stack">
            <label className="field-label" htmlFor="premium-whatsapp">
              Numéro WhatsApp
            </label>
            <Input
              aria-describedby="premium-whatsapp-help"
              aria-invalid={Boolean(errors.whatsappNumber)}
              autoComplete="tel"
              id="premium-whatsapp"
              inputMode="tel"
              placeholder="+2250701020304"
              type="tel"
              {...register("whatsappNumber")}
            />
            <p className="helper-text" id="premium-whatsapp-help">
              Utilisez le format international avec le signe +.
            </p>
          </div>
          <fieldset className="premium-payment-options">
            <legend className="field-label">Moyen choisi</legend>
            <label className="premium-payment-option">
              <input type="radio" value="WAVE" {...register("paymentMethod")} />
              Wave
            </label>
            <label className="premium-payment-option">
              <input
                type="radio"
                value="MOBILE_MONEY"
                {...register("paymentMethod")}
              />
              Mobile money
            </label>
          </fieldset>
          {(contactError || Object.keys(errors).length > 0) && (
            <p className="form-message" role="alert">
              {contactError || "Vérifiez les informations saisies."}
            </p>
          )}
          <Button
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingLabel="Copie en cours…"
            type="submit"
          >
            Contacter sur WhatsApp
          </Button>
        </form>
      </section>
    )
  }

  if (step === "final") {
    return (
      <section aria-labelledby="final-title" className="premium-panel ui-card">
        <p className="eyebrow">Dernière étape hors de Synapse</p>
        <h2 className="section-heading" id="final-title">
          Envoyez votre demande
        </h2>
        <p className="card-copy">
          Le récapitulatif est copié. Vous devez maintenant le coller dans
          WhatsApp, puis envoyer le message vous-même.
        </p>
        <p className="card-copy">
          L’administrateur doit encore vérifier et valider votre paiement avant
          d’attribuer l’accès Premium.
        </p>
        <a
          className="premium-contact-link"
          href={PREMIUM_WHATSAPP_URL}
          rel="noreferrer"
          target="_blank"
        >
          Rouvrir la conversation WhatsApp
        </a>
        {whatsappFrameUrl ? (
          <iframe
            className="premium-contact-frame"
            src={whatsappFrameUrl}
            title="Ouverture du contact WhatsApp"
          />
        ) : null}
      </section>
    )
  }

  return (
    <section
      aria-labelledby="premium-offer-title"
      className="premium-offer-layout"
    >
      <div className="premium-offer-hero">
        <p className="eyebrow">Synapse Premium</p>
        <h1 className="premium-offer-title" id="premium-offer-title">
          Accès à vie Synapse Premium
        </h1>
        <p className="premium-offer-description">
          Obtenez un accès illimité et permanent à l’ensemble du contenu Premium
          de Synapse — prompts, formations, jeux, opportunités et toutes les
          futures mises à jour — avec un unique paiement.
        </p>
        {totalCount === 0 ? (
          <p className="empty-state">
            Aucun contenu premium n’est disponible pour le moment.
          </p>
        ) : null}
      </div>

      <aside className="premium-price-card">
        <p className="premium-price-label">Synapse Premium</p>
        <p className="premium-offer-price">{formattedPrice}</p>
        <p className="premium-offer-once">Aucun abonnement</p>
        <ul className="premium-benefit-list">
          <li>{offer.counts.prompts}+ prompts Premium</li>
          <li>Formations et ressources exclusives</li>
          <li>Accès aux jeux &amp; concours Premium</li>
          <li>Accès aux meilleures opportunités</li>
          <li>Futurs contenus Premium inclus</li>
        </ul>

        {accountEmail ? (
          <Button
            className="premium-offer-cta"
            onClick={() => setStep("summary")}
            type="button"
          >
            Débloquer Synapse Premium
          </Button>
        ) : (
          <Link className="premium-offer-cta" href="/register">
            Débloquer Synapse Premium
          </Link>
        )}

        <p className="premium-login">
          Déjà membre ?<Link href="/login">Se connecter</Link>
        </p>
      </aside>

      <p className="premium-offer-support">
        Une question ?<Link href="/contact">Contacter le support</Link>
      </p>
    </section>
  )
}
