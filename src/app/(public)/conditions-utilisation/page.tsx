const PLACEHOLDER = "À compléter et faire valider"

export default function TermsPage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Gabarit juridique</p>
        <h1 className="page-heading">Conditions d&apos;utilisation</h1>
        <p className="lead legal-note">
          Ces conditions forment une structure de travail. Elles doivent être
          complétées et validées avant d&apos;engager Synapse.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Objet et acceptation</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Création et utilisation du compte</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Accès gratuit et premium</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Propriété intellectuelle</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">
            Responsabilités et droit applicable
          </h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
      </article>
    </main>
  )
}
