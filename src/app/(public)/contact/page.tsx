const PLACEHOLDER = "À compléter et faire valider"

export default function ContactPage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Restons en contact</p>
        <h1 className="page-heading">Contact</h1>
        <p className="lead">
          Choisissez le canal qui vous convient. Aucun formulaire ni aucune
          coordonnée ne sont inventés tant que Synapse ne les a pas validés.
        </p>
        <div className="institutional-grid">
          <section className="ui-card">
            <h2 className="card-heading">WhatsApp</h2>
            <p className="card-copy legal-placeholder">{PLACEHOLDER}</p>
          </section>
          <section className="ui-card">
            <h2 className="card-heading">E-mail</h2>
            <p className="card-copy legal-placeholder">{PLACEHOLDER}</p>
          </section>
          <section className="ui-card">
            <h2 className="card-heading">Réseaux sociaux</h2>
            <p className="card-copy legal-placeholder">{PLACEHOLDER}</p>
          </section>
        </div>
      </article>
    </main>
  )
}
