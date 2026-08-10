import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  expectReleaseEvidence,
  releaseEvidence,
  scenario,
} from "../fixtures/recette-v1-test-utils"

const ROOT = process.cwd()

function read(path: string): string {
  return readFileSync(join(ROOT, path), "utf8")
}

describe("preuves transverses de la recette v1", () => {
  it(
    scenario(
      "DoD commune — qualité, build et non-régression sont tous bloquants",
      "une candidate v1 comprenant toutes les tranches précédentes",
      "le workflow CI et la preuve finale sont inspectés",
      "lint, type-check, tests, build et E2E sont exécutés sans tolérance d'échec et la non-régression est consignée",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      for (const command of [
        "npm run lint",
        "npm run type-check",
        "npm run test",
        "npm run build",
        "npm run e2e",
      ]) {
        expect(workflow).toContain(command)
      }
      expect(workflow).not.toMatch(/continue-on-error:\s*true/u)
      expectReleaseEvidence(releaseEvidence(), [
        /non-régression[\s\S]{0,100}(?:réussie|verte|validée)/iu,
        /viewport[\s\S]{0,40}390\s*px/iu,
        /loading[\s\S]{0,60}error[\s\S]{0,60}empty[\s\S]{0,60}success/iu,
      ])
    },
  )

  it(
    scenario(
      "Audit sécurité — rate limiting et absence de secrets couvrent aussi l'historique",
      "les routes auth et inscriptions, l'état courant et tous les objets Git",
      "la preuve de sécurité et l'historique sont contrôlés",
      "les quotas sensibles de dix requêtes sont prouvés et aucun secret ni fichier .env réel n'est retrouvé dans l'historique",
    ),
    () => {
      const objects = execFileSync("git", ["rev-list", "--all", "--objects"], {
        cwd: ROOT,
        encoding: "utf8",
      })
      expect(objects).not.toMatch(/(?:^|\s)\.env(?:\.|$)(?!example)/mu)
      expectReleaseEvidence(releaseEvidence(), [
        /rate limit(?:ing)?[\s\S]{0,100}(?:auth|inscriptions?)[\s\S]{0,80}10/iu,
        /onzième[\s\S]{0,60}429/iu,
        /historique Git[\s\S]{0,100}(?:secret|\.env)[\s\S]{0,80}(?:aucun|absent)/iu,
      ])
    },
  )

  it(
    scenario(
      "Décision E06-01 — le partage WhatsApp reste une preuve manuelle du premier HTTPS public",
      "le premier déploiement HTTPS public et un contenu de chacune des quatre rubriques",
      "les prérequis Open Graph automatisés et le compte rendu du vrai fil WhatsApp sont inspectés",
      "date, téléphone, fil réel, quatre aperçus et absence de corps premium sont consignés sans confondre cette preuve avec une émulation",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /premier déploiement HTTPS public/iu,
        /vrai fil WhatsApp|fil WhatsApp réel/iu,
        /(?:date|réalisé le)\s*:/iu,
        /(?:téléphone|appareil|modèle)\s*:/iu,
        /prompts?[\s\S]{0,80}formations?[\s\S]{0,80}(?:jeux|concours)[\s\S]{0,80}opportunités?/iu,
        /aperçu premium[\s\S]{0,100}(?:sans|aucun)[\s\S]{0,50}(?:body|corps)/iu,
      ])
    },
  )

  it(
    scenario(
      "Le site entier — SEO, erreurs françaises et cohérence des quatre rubriques sont prouvés",
      "robots, sitemap, slugs inexistants et états vides des quatre rubriques",
      "la matrice de recette fonctionnelle est lue",
      "robots et sitemap répondent, member/brouillons/expirés sont absents, les 404 ne sont pas des 500 et les messages homogènes sont utiles et français",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /robots\.txt[\s\S]{0,60}(?:200|répond)/iu,
        /sitemap\.xml[\s\S]{0,100}(?:member|compte)[\s\S]{0,50}(?:absent|exclu)/iu,
        /sitemap[\s\S]{0,100}brouillon[\s\S]{0,50}(?:absent|exclu)/iu,
        /sitemap[\s\S]{0,120}opportunité périmée[\s\S]{0,50}(?:absente|exclue)/iu,
        /slug inexistant[\s\S]{0,60}404[\s\S]{0,60}(?:pas|aucun)[\s\S]{0,20}500/iu,
        /quatre rubriques[\s\S]{0,100}(?:mêmes|homogènes)[\s\S]{0,80}(?:états|messages|verrouillage)/iu,
        /aucun résultat pour ce filtre/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD documentaire — README et AGENTS portent les écarts et la suite décidée",
      "les écarts E06, E09, E10, E11, E12 et la décision administration d'abord",
      "README, AGENTS et la preuve de sortie sont inspectés",
      "la documentation publiée décrit le lancement Vercel, les limites v1 et l'administration comme prochaine étape sans paiement ni dashboard anticipé",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /Vercel/iu,
        /administration[\s\S]{0,80}(?:prochaine|en premier)/iu,
        /dashboard[\s\S]{0,50}hors v1/iu,
        /69 prompts?[\s\S]{0,50}20\s+FREE[\s\S]{0,50}49\s+PREMIUM/iu,
        /formations? événementielles?[\s\S]{0,80}inscriptions?/iu,
        /ressources\/[\s\S]{0,80}historique Git[\s\S]{0,50}(?:absent|exclu)/iu,
      ])
    },
  )
})
