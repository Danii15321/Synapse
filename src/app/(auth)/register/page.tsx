import Link from "next/link"

import RegisterForm from "@/components/features/auth/register-form"

export default function RegisterPage() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card auth-card">
        <h1 className="page-heading">Créer un compte</h1>
        <p className="auth-intro text-muted">Rejoignez Synapse gratuitement.</p>
        <RegisterForm />
        <p className="auth-switch">
          Déjà membre ?{" "}
          <Link className="inline-link" href="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  )
}
