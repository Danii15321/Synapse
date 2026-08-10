import Link from "next/link"

const FOOTER_LINKS = [
  ["À propos", "/a-propos"],
  ["Contact", "/contact"],
  ["Mentions légales", "/mentions-legales"],
  ["Confidentialité", "/confidentialite"],
  ["Conditions d'utilisation", "/conditions-utilisation"],
] as const

const RUBRIC_LINKS = [
  ["Prompts", "/prompts"],
  ["Formations", "/formations"],
  ["Jeux & concours", "/jeux"],
  ["Opportunités", "/opportunites"],
] as const

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <p className="footer-brand">Synapse</p>
          <p className="footer-copy">
            Du contenu utile pour avancer en intelligence artificielle et en
            entrepreneuriat. L&apos;offre membre donne un accès à vie.
          </p>
          <p className="footer-copy">
            © <span>{new Date().getFullYear()}</span> Synapse
          </p>
        </div>
        <div>
          <nav aria-label="Rubriques">
            <ul className="footer-link-list">
              {RUBRIC_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link
                    aria-label={`${label} — lien du pied de page`}
                    className="footer-link"
                    href={href}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Liens institutionnels">
            <ul className="footer-link-list">
              {FOOTER_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link className="footer-link" href={href}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  )
}
