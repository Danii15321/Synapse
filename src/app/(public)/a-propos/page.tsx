const PILLARS = [
  {
    description:
      "Bourses, formations, programmes, métiers et ressources utiles pour construire son parcours.",
    number: "01",
    title: "Orientation & Opportunités",
  },
  {
    description:
      "Formations, prompts, outils et cas pratiques pour rendre l'IA compréhensible et réellement utile.",
    number: "02",
    title: "Intelligence artificielle",
  },
  {
    description:
      "Des ressources et expériences pour aider les porteurs d'idées à passer à l'action.",
    number: "03",
    title: "Entrepreneuriat",
  },
] as const

const SOCIALS = [
  {
    label: "Facebook",
    path: "M14 8h3V4h-3c-3 0-5 2-5 5v3H6v4h3v8h4v-8h3.5l.5-4h-4V9c0-.7.3-1 1-1Z",
  },
  {
    label: "TikTok",
    path: "M15 4c.5 2.4 1.9 3.8 4 4v4c-1.5 0-2.8-.4-4-1.2V17a7 7 0 1 1-6-6.9v4.2A3 3 0 1 0 11 17V4h4Z",
  },
  {
    label: "Chaîne WhatsApp",
    path: "M12 3a9 9 0 0 0-7.7 13.7L3 21l4.4-1.2A9 9 0 1 0 12 3Zm4.7 12.4c-.2.6-1.2 1.1-1.8 1.2-.5.1-1.2.1-2-.2-1.5-.5-5-1.8-6.8-6-.5-1.2 0-2.6.5-3.1.4-.5.9-.6 1.2-.6h.8c.2 0 .5 0 .7.6l1 2.3c.1.3.1.5 0 .7l-.8 1c-.2.2-.3.4-.1.7.3.6 1.1 1.7 2.3 2.3.3.2.6.2.8-.1l1-1.2c.2-.3.5-.3.8-.2l2.1 1c.3.2.5.2.5.4 0 .2 0 .8-.2 1.2Z",
  },
] as const

export default function AboutPage() {
  return (
    <main className="page-shell about-page-shell">
      <div className="content-wide about-content">
        <section
          aria-labelledby="about-hero-title"
          className="about-region about-hero"
        >
          <p className="about-eyebrow">À propos de Synapse</p>
          <h1 className="about-title" id="about-hero-title">
            Une startup ivoirienne qui transforme l&apos;information en
            opportunités.
          </h1>
          <p className="about-intro">
            Synapse accompagne les jeunes dans leur orientation, leur
            compréhension des nouvelles technologies et le développement de
            leurs projets.
          </p>
        </section>

        <section
          aria-labelledby="about-conviction-title"
          className="about-region about-conviction"
        >
          <p className="about-conviction-label">Notre conviction</p>
          <h2 className="about-conviction-title" id="about-conviction-title">
            « L&apos;information est la première inégalité. »
          </h2>
          <p className="about-conviction-copy">
            Nous voulons réduire l&apos;écart entre ceux qui ont accès aux
            bonnes informations, aux bons outils et aux bonnes opportunités,
            et ceux qui n&apos;y ont pas encore accès.
          </p>
        </section>

        <section
          aria-labelledby="about-pillars-title"
          className="about-region"
        >
          <div className="about-section-heading">
            <p className="about-eyebrow">Nos domaines</p>
            <h2 className="about-section-title" id="about-pillars-title">
              Trois piliers au cœur de Synapse
            </h2>
          </div>
          <div className="about-pillar-grid">
            {PILLARS.map((pillar) => (
              <article className="about-pillar" key={pillar.number}>
                <p className="about-pillar-number">{pillar.number}</p>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="about-platform-title"
          className="about-region about-platform"
        >
          <div>
            <p className="about-eyebrow">Cette plateforme</p>
            <h2 className="about-platform-title" id="about-platform-title">
              Un espace dédié à l&apos;IA et à l&apos;entrepreneuriat.
            </h2>
          </div>
          <div className="about-platform-copy">
            <p>
              Cette plateforme rassemble principalement les contenus, prompts,
              formations, jeux et ressources de Synapse liés à
              l&apos;intelligence artificielle et à l&apos;entrepreneuriat.
            </p>
            <p>
              Les actions liées à l&apos;orientation et aux opportunités sont
              également développées à travers nos autres canaux, programmes et
              communautés.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="about-social-title"
          className="about-region about-social"
        >
          <div className="about-section-heading">
            <p className="about-eyebrow">Nous suivre</p>
            <h2 className="about-section-title" id="about-social-title">
              Retrouvez Synapse sur nos réseaux
            </h2>
            <p className="about-social-intro">
              Suivez nos contenus, opportunités, événements et actualités sur
              nos différentes plateformes.
            </p>
          </div>
          <ul className="about-social-list">
            {SOCIALS.map((social) => (
              <li className="about-social-card" key={social.label}>
                <span className="about-social-icon">
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </span>
                <strong>{social.label}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  )
}
