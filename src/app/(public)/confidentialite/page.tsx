export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <article className="content-reading">
        <p className="eyebrow">Données de la v1</p>
        <h1 className="page-heading">Confidentialité</h1>
        <p className="lead">
          La plateforme traite les données nécessaires au compte et aux
          inscriptions demandées par ses membres.
        </p>
        <section className="legal-section">
          <h2 className="section-heading">Compte utilisateur</h2>
          <p className="legal-copy">
            Lors de l&apos;inscription, une adresse e-mail et un mot de passe
            sont demandés. Le mot de passe est conservé uniquement sous forme
            hachée. Une session sécurisée permet ensuite d&apos;accéder au
            compte.
          </p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Participations</h2>
          <p className="legal-copy">
            Quand un membre s&apos;inscrit à un jeu, un concours ou une
            formation événementielle, la plateforme associe cette participation
            à son compte. Les activités elles-mêmes se déroulent hors du site.
          </p>
        </section>
        <section className="legal-section">
          <h2 className="section-heading">Limites de la v1</h2>
          <p className="legal-copy">
            La suppression du compte et l&apos;export de ses données ne sont pas
            disponibles en libre-service. Aucun canal public ayant été validé,
            le site ne publie pas de procédure de demande qui serait
            inutilisable ou fictive.
          </p>
        </section>
      </article>
    </main>
  )
}
