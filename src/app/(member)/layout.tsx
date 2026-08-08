import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { requireUser } from "@/server/auth/require-user"

export default async function MemberLayout({
  children,
}: {
  children: ReactNode
}) {
  try {
    await requireUser()
  } catch {
    redirect("/login")
  }

  return children
}
