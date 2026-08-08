import type { Metadata } from "next"
import type { ReactNode } from "react"

import { SiteNavigation } from "@/components/site-navigation"
import { auth } from "@/server/auth/config"
import { config } from "@/server/config"

import "./globals.css"

export const metadata: Metadata = {
  title: "Synapse",
  description: "Le socle de la plateforme Synapse",
}

void config

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <SiteNavigation authenticated={Boolean((await auth())?.user)} />
        {children}
      </body>
    </html>
  )
}
