export default function TermsPage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Fonctionnement de la v1</p>
        <h1 className="page-heading">Conditions d&apos;utilisation</h1>
        <p className="lead">
          Synapse met à disposition une vitrine, une bibliothèque de contenus et
          un point d&apos;inscription aux activités présentées.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Compte</h2>
          <p className="legal-copy">
            La création d&apos;un compte permet de se connecter, de consulter
            son statut de membre et de retrouver ses inscriptions. Chaque membre
            utilise son propre compte.
          </p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Accès gratuit et premium</h2>
          <p className="legal-copy">
            Les contenus gratuits sont ouverts à tous. Les contenus premium ne
            sont servis qu&apos;aux membres disposant de cet accès. Le paiement
            réel et l&apos;attribution automatique du statut ne font pas partie
            de la v1.
          </p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Jeux, concours et formations</h2>
          <p className="legal-copy">
            Le site présente les activités et enregistre les inscriptions. Leur
            déroulement a lieu en présentiel ou sur un autre canal, hors de la
            plateforme.
          </p>
        </section>
      </article>
    </main>
  )
}
