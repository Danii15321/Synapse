import Link from "next/link"

export function PremiumGate() {
  return (
    <Link className="premium-gate detail-section" href="/register">
      <div className="premium-gate-preview">
        <div aria-hidden="true" className="premium-gate-lines blur">
          <span className="premium-gate-line" />
          <span className="premium-gate-line" />
          <span className="premium-gate-line" />
        </div>
        <span className="premium-gate-label">
          <span className="card-heading">Contenu verrouillé</span>
        </span>
      </div>
      <div className="premium-gate-copy">
        <span>
          <span className="card-heading">Débloquez la méthode complète</span>
          <span className="card-copy">
            Créez votre compte pour découvrir l&apos;offre et accéder aux
            ressources exclusives réservées aux membres.
          </span>
        </span>
        <span className="premium-callout-link">Devenir membre</span>
      </div>
    </Link>
  )
}
