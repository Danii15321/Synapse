import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"

import AccountParticipations from "@/components/features/account-participations"
import AccountPrivacy from "@/components/features/account-privacy"
import AccountProfile from "@/components/features/account-profile"
import {
  getMyParticipations,
  waitForPendingParticipation,
} from "@/lib/account-participations-server"
import {
  parsePendingParticipation,
  PENDING_PARTICIPATION_COOKIE,
} from "@/lib/validators/pending-participation"
import { getAccount, requireUser } from "@/server"

import { changePasswordAction } from "./change-password-action"

export const dynamic = "force-dynamic"

type AccountPageProps = Readonly<{
  searchParams: Promise<{
    passwordChanged?: string | string[]
    section?: string | string[]
  }>
}>

async function readPendingParticipation() {
  try {
    const cookieStore = await cookies()
    return parsePendingParticipation(
      cookieStore.get(PENDING_PARTICIPATION_COOKIE)?.value,
    )
  } catch {
    return null
  }
}

async function readAccount(userId: string) {
  try {
    return await getAccount(userId)
  } catch {
    redirect("/login")
  }
}

const MEMBERSHIP_PRESENTATION = {
  FREE: { label: "FREE", offerHref: "/premium" },
  PREMIUM: { label: "Accès à vie", offerHref: null },
} as const

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const privacy = params.section === "confidentialite"
  const user = await requireUser().catch(() => redirect("/login"))
  const account = await readAccount(user.id)
  const membership = MEMBERSHIP_PRESENTATION[account.membership]

  let participations = null
  if (!privacy) {
    const pendingParticipation = await readPendingParticipation()
    if (pendingParticipation) {
      await waitForPendingParticipation(pendingParticipation, user)
    }
    participations = await getMyParticipations({ take: 20 }, user)
  }

  return (
    <main className="page-shell">
      <div className="content-reading account-page">
        <h1 className="page-heading">Mon compte</h1>
        <nav aria-label="Compte" className="account-navigation">
          <Link
            aria-current={privacy ? undefined : "page"}
            className="account-navigation-link"
            href="/compte"
          >
            Mon profil
          </Link>
          <Link
            aria-current={privacy ? "page" : undefined}
            className="account-navigation-link"
            href="/compte?section=confidentialite"
          >
            Confidentialité
          </Link>
        </nav>

        {privacy ? (
          <section className="account-view" aria-labelledby="privacy-heading">
            <h2 className="section-heading" id="privacy-heading">
              Confidentialité
            </h2>
            <AccountPrivacy
              changePasswordAction={changePasswordAction}
              passwordChanged={params.passwordChanged}
            />
          </section>
        ) : (
          <section className="account-view" aria-labelledby="profile-heading">
            <h2 className="section-heading" id="profile-heading">
              Mon profil
            </h2>
            <section className="account-membership ui-card">
              <div>
                <p className="eyebrow">Adhésion</p>
                <p className="account-membership-value">
                  {membership.label}
                </p>
              </div>
              {membership.offerHref ? (
                <Link
                  className="premium-callout-link"
                  href={membership.offerHref}
                >
                  Devenir membre
                </Link>
              ) : null}
            </section>
            <section className="account-section ui-card">
              <h3 className="account-subheading">Informations personnelles</h3>
              <AccountProfile account={account} />
            </section>
            <section className="account-section ui-card">
              <h3 className="account-subheading">Mes participations</h3>
              <AccountParticipations
                initialItems={participations?.items ?? []}
                userId={user.id}
              />
            </section>
            <form
              action="/api/auth/logout"
              className="account-logout-form"
              method="post"
            >
              <button
                className="ui-button min-h-touch account-logout-button"
                type="submit"
              >
                Se déconnecter
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  )
}
