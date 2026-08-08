const PLACEHOLDER = "À compléter et faire valider"

export default function LegalNoticePage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Gabarit juridique</p>
        <h1 className="page-heading">Mentions légales</h1>
        <p className="lead legal-note">
          Ce document est un gabarit et doit être complété puis validé avant la
          mise en production.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Éditeur du site</h2>
          <ul className="legal-list">
            <li>
              Identité ou raison sociale :{" "}
              <span className="legal-placeholder">{PLACEHOLDER}</span>
            </li>
            <li>
              Adresse : <span className="legal-placeholder">{PLACEHOLDER}</span>
            </li>
            <li>
              Contact : <span className="legal-placeholder">{PLACEHOLDER}</span>
            </li>
            <li>
              Responsable de publication :{" "}
              <span className="legal-placeholder">{PLACEHOLDER}</span>
            </li>
          </ul>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Hébergeur</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Propriété intellectuelle</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
      </article>
    </main>
  )
}
