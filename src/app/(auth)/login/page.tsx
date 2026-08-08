import Link from "next/link"

import LoginForm from "@/components/features/auth/login-form"

export default function LoginPage() {
  return (
    <main className="centered-page-shell">
      <section className="content-narrow ui-card auth-card">
        <h1 className="page-heading">Connexion</h1>
        <p className="auth-intro text-muted">
          Retrouvez votre espace membre Synapse.
        </p>
        <LoginForm />
        <p className="auth-switch">
          Pas encore de compte ?{" "}
          <Link className="inline-link" href="/register">
            S’inscrire
          </Link>
        </p>
      </section>
    </main>
  )
}
