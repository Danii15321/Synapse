import type { Metadata } from "next"
import type { ReactNode } from "react"

import { config } from "@/server/config"

import "./globals.css"

export const metadata: Metadata = {
  title: "Synapse",
  description: "Le socle de la plateforme Synapse",
}

void config

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
