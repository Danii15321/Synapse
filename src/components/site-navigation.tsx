import Link from "next/link"

export function SiteNavigation({ authenticated }: { authenticated: boolean }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex min-h-touch items-center justify-between border-b bg-surface px-5 py-2"
    >
      <Link className="min-h-touch py-3 font-bold text-accent" href="/">
        Synapse
      </Link>
      {authenticated ? (
        <div className="flex items-center gap-2">
          <Link className="min-h-touch px-3 py-3 font-medium" href="/compte">
            Compte
          </Link>
          <form action="/api/auth/logout" method="post">
            <ButtonLogout />
          </form>
        </div>
      ) : (
        <Link className="min-h-touch px-3 py-3 font-medium" href="/login">
          Connexion
        </Link>
      )}
    </nav>
  )
}

function ButtonLogout() {
  return (
    <button className="min-h-touch rounded-control px-3 font-medium" type="submit">
      Se déconnecter
    </button>
  )
}
