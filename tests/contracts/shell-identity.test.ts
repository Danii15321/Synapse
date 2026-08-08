import { createHash } from "node:crypto"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { extname, join } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function scenario(
  name: string,
  given: string,
  when: string,
  then: string,
): string {
  return `${name} — ce qui est vérifié\nGIVEN : ${given}\nWHEN  : ${when}\nTHEN  : ${then}`
}

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8")
}

function filesUnder(directory: string): string[] {
  if (!existsSync(join(ROOT, directory))) return []
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap(
    (entry) => {
      const path = join(directory, entry.name)
      return entry.isDirectory() ? filesUnder(path) : [path]
    },
  )
}

const HARD_CODED_DIMENSION_PATTERNS = [
  /(?:^|[\s"'`])(?:[a-z-]+:)*-?(?:p[trblxy]?|m[trblxy]?|gap|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|indent)-(?:\d+(?:[./]\d+)?|px)(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*text-(?:xs|sm|base|lg|xl|\d+xl)(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*leading-(?:none|tight|snug|normal|relaxed|loose|\d+)(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*tracking-[^\s"'`]+/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:size|basis|w|h|min-w|min-h|max-w|max-h)-(?:\d+(?:[./]\d+)?|px|xs|sm|md|lg|xl|\d+xl|prose)(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:grid-cols|grid-rows|col-span|row-span)-\d+(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:border|outline|outline-offset)-\d+(?=$|[\s"'`])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*rounded-(?:xs|sm|md|lg|xl|\d+xl)(?=$|[\s"'`])/g,
]

const HARD_CODED_COLOR_PATTERNS = [
  /(?:#[0-9a-f]{3,8}|rgba?\(|hsla?\()/gi,
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:bg|text|border|ring|outline)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d+)?(?=$|[\s"'`/])/g,
  /(?:^|[\s"'`])(?:[a-z-]+:)*(?:bg|text|border|ring|outline)-[a-z][\w-]*\/\d+/g,
]

function hardCodedVisualValues(source: string): string[] {
  return [
    ...HARD_CODED_DIMENSION_PATTERNS,
    ...HARD_CODED_COLOR_PATTERNS,
  ].flatMap((pattern) =>
    Array.from(source.matchAll(pattern), (match) => match[0].trim()),
  )
}

describe("contrat du shell et de l'identité Synapse", () => {
  it(
    scenario(
      "Les tokens appliquent la charte fournie",
      "la charte Synapse validée avec fond crème, bleu nuit, accents indigo, magenta et orange",
      "les styles globaux et la configuration Tailwind sont inspectés",
      "les six couleurs de marque, le gradient signature, Montserrat pour les titres et Inter pour le corps sont centralisés dans les tokens",
    ),
    () => {
      const styles = `${read("src/app/globals.css")}\n${read("tailwind.config.ts")}`

      for (const color of [
        "#07183D",
        "#1D25B5",
        "#C00062",
        "#F15A00",
        "#FBF8F3",
        "#555762",
      ]) {
        expect(styles.toUpperCase(), color).toContain(color.toUpperCase())
      }
      expect(styles).toMatch(
        /gradient[^\n]*(?:F15A00|orange)[^\n]*(?:C00062|magenta)[^\n]*(?:1D25B5|indigo)/i,
      )
      expect(styles).toMatch(/Montserrat/)
      expect(styles).toMatch(/Inter/)
      expect(styles).toMatch(/font-(?:heading|title)/)
      expect(styles).toMatch(/font-(?:body|sans)/)
    },
  )

  it(
    scenario(
      "Les composants n'échappent pas au vocabulaire visuel",
      "tous les composants et pages repris des tranches 02 à 05",
      "leurs classes, attributs et déclarations sont analysés",
      "aucune couleur, taille, espacement, dimension ou suivi typographique arbitraire ou numérique n'est écrit en dur dans un composant ; seules les classes sémantiques centralisées sont utilisées",
    ),
    () => {
      const files = filesUnder("src").filter((file) => /\.tsx$/.test(file))
      const violations = files.flatMap((file) => {
        const source = read(file)
        const found = hardCodedVisualValues(source).map(
          (value) => `${file}: ${value}`,
        )
        if (
          /(?:text|tracking|leading|p[trblxy]?|m[trblxy]?|gap|space-[xy]|w|h|min-[wh]|max-[wh])-\[[^\]]+\]/.test(
            source,
          )
        ) {
          found.push(`${file}: valeur Tailwind arbitraire`)
        }
        if (/style\s*=\s*{{/.test(source)) {
          found.push(`${file}: style inline`)
        }
        return found
      })

      expect(violations).toEqual([])
    },
  )

  it(
    scenario(
      "Le logo source reste intact et fournit les déclinaisons du shell",
      "le logo vertical fourni par le porteur et la décision de ne jamais le modifier",
      "son empreinte et les actifs publics dérivés sont contrôlés",
      "le PNG original garde son empreinte, un pictogramme distinct alimente le header et les icônes d'application",
    ),
    () => {
      const logo = readFileSync(
        join(ROOT, "ressources/charte-graphique/logo.png"),
      )
      const digest = createHash("sha256").update(logo).digest("hex")
      const assets = filesUnder("public")

      expect(digest).toBe(
        "5d4b69fa2fac06624a8b51fe11e1c334acde8a17efac6714207884cef4333a12",
      )
      expect(
        assets.some((file) =>
          /(?:pictogram|mark|symbole).*\.(?:png|webp|svg)$/i.test(file),
        ),
      ).toBe(true)
      expect(existsSync(join(ROOT, "src/app/icon.png"))).toBe(true)
      expect(existsSync(join(ROOT, "src/app/apple-icon.png"))).toBe(true)
    },
  )

  it(
    scenario(
      "Le layout reste serveur et isole ses deux îlots interactifs",
      "le layout racine, le menu mobile et l'indicateur de session",
      "les frontières client sont inspectées",
      "le layout et le header ne portent pas use client, seuls le menu mobile et l'indicateur de session le déclarent",
    ),
    () => {
      const layout = read("src/app/layout.tsx")
      const navigation = read("src/components/site-navigation.tsx")
      const mobileMenu = read("src/components/mobile-menu.tsx")
      const sessionIndicator = read("src/components/session-indicator.tsx")

      expect(layout).not.toMatch(/^\s*["']use client["']/)
      expect(navigation).not.toMatch(/^\s*["']use client["']/)
      expect(mobileMenu).toMatch(/^\s*["']use client["']/)
      expect(sessionIndicator).toMatch(/^\s*["']use client["']/)
      expect(layout).toMatch(/SiteNavigation|SiteHeader/)
      expect(layout).toMatch(/SiteFooter/)
    },
  )

  it(
    scenario(
      "Un seul Badge premium porte l'identité d'adhésion",
      "les écrans existants et le shell qui doivent signaler le premium",
      "les composants et les cadenas textuels sont recensés",
      "un composant PremiumBadge unique existe et aucun composant métier ne dessine son propre cadenas premium",
    ),
    () => {
      const badgePath = "src/components/ui/premium-badge.tsx"
      expect(statSync(join(ROOT, badgePath)).isFile()).toBe(true)

      const offenders = filesUnder("src/components")
        .filter((file) => file !== badgePath && /\.tsx$/.test(file))
        .filter((file) => /🔒|🔐/.test(read(file)))

      expect(offenders).toEqual([])
      expect(read(badgePath)).toMatch(/Premium/)
    },
  )

  it(
    scenario(
      "Les composants atomiques partagent leurs états d'interaction",
      "Button et Input utilisés par les écrans existants",
      "leurs variantes Tailwind sont inspectées",
      "survol, focus visible et désactivation sont explicites, et Button matérialise aussi l'état de chargement accessible",
    ),
    () => {
      const button = read("src/components/ui/button.tsx")
      const input = read("src/components/ui/input.tsx")

      for (const state of ["hover:", "focus-visible:", "disabled:"]) {
        expect(button, `Button ${state}`).toContain(state)
      }
      for (const state of ["focus-visible:", "disabled:"]) {
        expect(input, `Input ${state}`).toContain(state)
      }
      expect(button).toMatch(/aria-busy|loading|isLoading/)
    },
  )

  it(
    scenario(
      "Les métadonnées et fichiers de découverte utilisent les conventions Next",
      "une application partageable et indexable sans domaine définitif",
      "le layout et les conventions de fichiers App Router sont inspectés",
      "metadataBase dérive de SITE_URL, le titre possède un gabarit, et robots, sitemap, manifest et image Open Graph sont générés par Next",
    ),
    () => {
      const layout = read("src/app/layout.tsx")
      const required = [
        "src/app/robots.ts",
        "src/app/sitemap.ts",
        "src/app/manifest.ts",
        "src/app/opengraph-image.tsx",
      ]

      expect(layout).toMatch(/metadataBase\s*:/)
      expect(layout).toMatch(/config\.SITE_URL|SITE_URL/)
      expect(layout).toMatch(/default\s*:/)
      expect(layout).toMatch(/template\s*:/)
      expect(layout).toMatch(/openGraph\s*:/)
      for (const path of required) {
        expect(existsSync(join(ROOT, path)), path).toBe(true)
      }
    },
  )

  it(
    scenario(
      "Quatre visuels de repli modernes respectent la convention par rubrique",
      "un futur contenu sans image dans chacune des quatre rubriques",
      "les actifs publics sont recensés",
      "un fallback Prompts, Formations, Jeux et Opportunités existe en WebP ou AVIF, prêt pour des cartes 4/3",
    ),
    () => {
      const modernImages = filesUnder("public").filter((file) =>
        [".webp", ".avif"].includes(extname(file).toLowerCase()),
      )

      for (const rubric of [
        /prompt/i,
        /formation/i,
        /jeu|concours/i,
        /opportunit/i,
      ]) {
        expect(
          modernImages.some((file) => rubric.test(file)),
          String(rubric),
        ).toBe(true)
      }
    },
  )

  it(
    scenario(
      "La mise en avant assume une carte provisoire jusqu'à la tranche 07",
      "la page d'accueil avant la définition du patron Prompts",
      "son composant de contenu récent est inspecté",
      "une carte explicitement provisoire est isolée et documente son remplacement en tranche 07 sans figer un ContentCard générique",
    ),
    () => {
      const path = "src/components/features/provisional-content-card.tsx"
      const source = read(path)

      expect(source).toMatch(/provisoire/i)
      expect(source).toMatch(/tranche\s*0?7/i)
      expect(
        existsSync(join(ROOT, "src/components/features/content-card.tsx")),
      ).toBe(false)
    },
  )
})
