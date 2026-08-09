import ChangePasswordForm from "@/components/features/auth/change-password-form"
import SessionRotationReload from "@/components/features/auth/session-rotation-reload"
import AccountParticipations from "@/components/features/account-participations"
import { redirect } from "next/navigation"

import { getMyParticipations } from "@/lib/account-participations-server"
import { getAccount, requireUser } from "@/server"
import { changePasswordAction } from "./change-password-action"

export const dynamic = "force-dynamic"

const MEMBERSHIP_LABEL = {
  FREE: "FREE",
  PREMIUM: "Accès à vie",
} as const

type AccountPageProps = Readonly<{
  searchParams: Promise<{ passwordChanged?: string | string[] }>
}>

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const passwordChanged = params.passwordChanged
  let account
  let user
  try {
    user = await requireUser()
    account = getAccount(user)
  } catch {
    redirect("/login")
  }
  const participations = await getMyParticipations({ take: 20 }, user)

  return (
    <main className="page-shell">
      <div className="content-reading">
        <h1 className="page-heading">Mon compte</h1>
        <section className="account-section ui-card">
          <h2 className="section-heading">Profil</h2>
          <dl className="account-list">
            <div>
              <dt className="account-label">E-mail</dt>
              <dd className="account-value">{account.email}</dd>
            </div>
            <div>
              <dt className="account-label">Adhésion</dt>
              <dd className="account-value">
                {MEMBERSHIP_LABEL[account.membership]}
              </dd>
            </div>
          </dl>
        </section>
        <section className="account-section ui-card">
          <h2 className="section-heading">Mes participations</h2>
          <AccountParticipations initialItems={participations.items} />
        </section>
        <section className="account-section ui-card">
          <h2 className="section-heading">Sécurité</h2>
          {passwordChanged === "rotating" && <SessionRotationReload />}
          {passwordChanged === "1" && (
            <p className="form-message" role="status">
              Mot de passe modifié avec succès.
            </p>
          )}
          <ChangePasswordForm
            action={changePasswordAction}
            successful={
              passwordChanged === "rotating" || passwordChanged === "1"
            }
          />
        </section>
      </div>
    </main>
  )
}
