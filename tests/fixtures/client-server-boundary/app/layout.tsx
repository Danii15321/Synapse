import type { ReactNode } from "react"

export default function Layout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
