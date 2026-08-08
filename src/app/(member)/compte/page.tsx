import ChangePasswordForm from "@/components/features/auth/change-password-form"
import SessionRotationReload from "@/components/features/auth/session-rotation-reload"
import { redirect } from "next/navigation"

import { getAccount, requireUser } from "@/server"
import { changePasswordAction } from "./change-password-action"

export const dynamic = "force-dynamic"

type AccountPageProps = Readonly<{
  searchParams: Promise<{ passwordChanged?: string | string[] }>
}>

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams
  const passwordChanged = params.passwordChanged
  let account
  try {
    account = getAccount(await requireUser())
  } catch {
    redirect("/login")
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10 sm:py-16">
      <h1 className="text-3xl font-bold">Mon compte</h1>
      <section className="mt-6 rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-semibold">Profil</h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-sm text-foreground/60">E-mail</dt>
            <dd className="break-all font-medium">{account.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-foreground/60">Adhésion</dt>
            <dd className="font-semibold text-accent">{account.membership}</dd>
          </div>
        </dl>
      </section>
      <section className="mt-6 rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h2 className="mb-5 text-xl font-semibold">Sécurité</h2>
        {passwordChanged === "rotating" && <SessionRotationReload />}
        {passwordChanged === "1" && (
          <p className="mb-5 text-sm" role="status">
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
    </main>
  )
}
