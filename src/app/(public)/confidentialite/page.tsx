const PLACEHOLDER = "À compléter et faire valider"

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Gabarit juridique</p>
        <h1 className="page-heading">Confidentialité</h1>
        <p className="lead legal-note">
          Cette politique doit refléter les pratiques réelles de Synapse. Les
          informations non fournies restent explicitement à valider.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Responsable du traitement</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Données traitées et finalités</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Bases légales</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Conservation et destinataires</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Vos droits et contact</h2>
          <p className="legal-copy legal-placeholder">{PLACEHOLDER}</p>
        </section>
      </article>
    </main>
  )
}
