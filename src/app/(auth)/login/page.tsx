import Link from "next/link"

import LoginForm from "@/components/features/auth/login-form"

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold">Connexion</h1>
        <p className="mb-7 mt-2 text-foreground/70">
          Retrouvez votre espace membre Synapse.
        </p>
        <LoginForm />
        <p className="mt-6 text-center text-sm">
          Pas encore de compte ?{" "}
          <Link className="font-semibold text-accent" href="/register">
            S’inscrire
          </Link>
        </p>
      </section>
    </main>
  )
}
