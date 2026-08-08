import Link from "next/link"

import RegisterForm from "@/components/features/auth/register-form"

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 sm:py-16">
      <section className="rounded-card bg-surface p-6 shadow-card sm:p-8">
        <h1 className="text-3xl font-bold">Créer un compte</h1>
        <p className="mb-7 mt-2 text-foreground/70">
          Rejoignez Synapse gratuitement.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm">
          Déjà membre ?{" "}
          <Link className="font-semibold text-accent" href="/login">
            Se connecter
          </Link>
        </p>
      </section>
    </main>
  )
}
