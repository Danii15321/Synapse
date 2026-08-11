import Link from "next/link"

const FOOTER_LINKS = [
  ["À propos", "/a-propos"],
  ["Contact", "/contact"],
] as const

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
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
    </footer>
  )
}
