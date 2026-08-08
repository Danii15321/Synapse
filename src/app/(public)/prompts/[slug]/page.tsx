import { notFound } from "next/navigation"

import { PremiumGate } from "@/components/features/premium-gate"
import type { SessionUser } from "@/lib/validators/auth"
import { promptSlugParamsSchema } from "@/lib/validators/prompt"
import { auth } from "@/server/auth/config"
import { ContentNotFoundError } from "@/server/errors"
import { getPromptBySlug } from "@/server/services/prompt-service"

export const dynamic = "force-dynamic"

const VISIBILITY_LABEL = {
  FREE: "Libre",
  PREMIUM: "Premium",
} as const

async function loadPrompt(slug: string, user: SessionUser | null) {
  try {
    return await getPromptBySlug(slug, user)
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      notFound()
    }

    throw error
  }
}

export default async function PromptDetailPage({
  params,
}: Readonly<{ params: Promise<{ slug: string }> }>) {
  const parsedParams = promptSlugParamsSchema.safeParse(await params)
  if (!parsedParams.success) {
    notFound()
  }

  const session = await auth()
  const prompt = await loadPrompt(parsedParams.data.slug, session?.user ?? null)

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 sm:py-16">
      <article className="mx-auto w-full max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-foreground">
            {VISIBILITY_LABEL[prompt.visibility]}
          </span>
          {prompt.tags.map((tag) => (
            <span
              className="rounded-full bg-foreground/[0.06] px-3 py-1 text-sm text-foreground/70"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">
          {prompt.title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-foreground/70">
          {prompt.summary}
        </p>

        <section className="mt-8 rounded-card bg-surface p-5 shadow-card sm:p-8">
          <h2 className="text-lg font-bold">Ce que vous allez obtenir</h2>
          <p className="mt-3 whitespace-pre-wrap leading-7">{prompt.excerpt}</p>
        </section>

        {"body" in prompt ? (
          <section className="mt-8 rounded-card bg-surface p-5 shadow-card sm:p-8">
            <h2 className="text-lg font-bold">Le prompt complet</h2>
            <p className="mt-3 whitespace-pre-wrap leading-7">{prompt.body}</p>
          </section>
        ) : (
          <PremiumGate />
        )}
      </article>
    </main>
  )
}
