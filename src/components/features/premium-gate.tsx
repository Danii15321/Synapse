import Link from "next/link"

export function PremiumGate() {
  return (
    <Link
      className="group mt-8 block min-h-touch overflow-hidden rounded-card border border-foreground/10 bg-surface shadow-card transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      href="/register"
    >
      <div className="relative overflow-hidden border-b border-foreground/10 bg-foreground/[0.04] px-5 py-6">
        <div
          aria-hidden="true"
          className="pointer-events-none space-y-3 blur-sm transition group-hover:blur"
        >
          <div className="h-3 w-full rounded-full bg-foreground/25" />
          <div className="h-3 w-11/12 rounded-full bg-foreground/20" />
          <div className="h-3 w-4/5 rounded-full bg-foreground/15" />
        </div>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
          🔒 Contenu exclusif verrouillé
        </span>
      </div>

      <div className="flex min-h-touch flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="block text-lg font-bold">
            Débloquez la méthode complète
          </span>
          <span className="mt-1 block text-sm leading-6 text-foreground/70">
            Devenez membre pour accéder à ce contenu exclusif et à toutes les
            prochaines ressources réservées aux membres.
          </span>
        </span>
        <span className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-control bg-accent px-5 font-semibold text-white">
          Devenir membre
        </span>
      </div>
    </Link>
  )
}
