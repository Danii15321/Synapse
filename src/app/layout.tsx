import type { Metadata } from "next"
import type { ReactNode } from "react"

import "@fontsource-variable/inter/wght.css"
import "@fontsource-variable/montserrat/wght.css"

import SiteFooter from "@/components/site-footer"
import { SiteNavigation } from "@/components/site-navigation"
import { auth } from "@/server/auth/config"
import { config } from "@/server/config"

import "./globals.css"
import "./site.css"

const DEFAULT_DESCRIPTION =
  "Synapse rassemble des contenus utiles en intelligence artificielle et entrepreneuriat pour accompagner et former les jeunes ivoiriens."

export const metadata: Metadata = {
  metadataBase: new URL(config.SITE_URL),
  title: {
    default: "Synapse — Contenus pour avancer",
    template: "%s | Synapse",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        alt: "Identité visuelle Synapse",
        height: 630,
        url: "/brand/opengraph-synapse.webp",
        width: 1200,
      },
    ],
    locale: "fr_CI",
    siteName: "Synapse",
    title: "Synapse — Contenus pour avancer",
    type: "website",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth()

  return (
    <html lang="fr">
      <body>
        <SiteNavigation
          authenticated={Boolean(session?.user)}
          membership={session?.user.membership ?? null}
        />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
