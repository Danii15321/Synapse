export default function LegalNoticePage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Informations sur le site</p>
        <h1 className="page-heading">Mentions légales</h1>
        <p className="lead">
          Synapse est la plateforme qui centralise des contenus utiles pour
          accompagner et former les jeunes ivoiriens.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Finalité de la plateforme</h2>
          <p className="legal-copy">
            Le site présente des prompts, des formations, des jeux et concours,
            ainsi que des bons plans et opportunités. Il sert de vitrine, de
            bibliothèque de contenus et de point d&apos;inscription.
          </p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Publication des contenus</h2>
          <p className="legal-copy">
            Les contenus affichés sont fournis par Synapse. Certains sont
            accessibles gratuitement et d&apos;autres sont réservés aux membres
            premium, avec un contrôle réalisé sur le serveur.
          </p>
        </section>
      </article>
    </main>
  )
}
