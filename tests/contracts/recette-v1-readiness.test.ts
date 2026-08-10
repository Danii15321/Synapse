import { execFileSync, spawnSync } from "node:child_process"
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

describe("contrat de mise en ligne de la v1", () => {
  it(
    scenario(
      "DoD — les trois parcours E2E sont bloquants dans la CI",
      "une branche candidate à la v1 et les profils anonyme, FREE et PREMIUM",
      "le workflow et les preuves de recette sont inspectés",
      "la CI exécute Playwright et la recette identifie explicitement les trois parcours comme preuves bloquantes",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      expect(workflow).toMatch(/npm run e2e/u)
      expect(workflow).not.toMatch(
        /continue-on-error:\s*true[\s\S]{0,160}npm run e2e/u,
      )
      expectReleaseEvidence(releaseEvidence(), [
        /parcours[\s\S]{0,120}visiteur anonyme/iu,
        /parcours[\s\S]{0,120}membre\s+FREE/iu,
        /parcours[\s\S]{0,120}membre\s+PREMIUM/iu,
        /CI[\s\S]{0,80}(?:vert|bloquant|réussi)/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD — le tableau d'entitlement est exhaustif et couvre les réponses brutes",
      "quatre rubriques et leurs champs verrouillés body et externalUrl",
      "la preuve d'audit finale est lue",
      "chaque rubrique nomme ses champs, les acteurs anonyme et FREE, ainsi que JSON brut, HTML servi et payload RSC",
    ),
    () => {
      const evidence = releaseEvidence()
      expectReleaseEvidence(evidence, [
        /audit d['’]entitlement/iu,
        /prompts?[\s\S]{0,120}\bbody\b/iu,
        /formations?[\s\S]{0,120}\bbody\b/iu,
        /(?:jeux|concours)[\s\S]{0,120}\bbody\b/iu,
        /opportunités?[\s\S]{0,160}\bbody\b[\s\S]{0,80}\bexternalUrl\b/iu,
        /anonyme[\s\S]{0,80}\bFREE\b/iu,
        /JSON brut/iu,
        /HTML servi/iu,
        /RSC/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD et piège — un vrai téléphone porte une preuve manuelle distincte de l'émulation",
      "la recette automatisée terminée et un premier déploiement HTTPS public",
      "le compte rendu manuel est inspecté",
      "il consigne date, appareil physique, navigateur, résultat tactile et lisibilité, sans prétendre qu'un viewport DevTools suffit",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /téléphone (?:réel|physique)/iu,
        /(?:date|réalisé le)\s*:/iu,
        /(?:appareil|modèle)\s*:/iu,
        /navigateur\s*:/iu,
        /cibles? tactiles?[\s\S]{0,80}(?:44|conforme|réussi)/iu,
        /(?:plein soleil|lisibilité|contraste)/iu,
        /clavier[\s\S]{0,80}(?:champ|formulaire)/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD — audit npm, headers et revue de sécurité sont des portes de sortie",
      "une candidate de release et les pages publiques et protégées",
      "la CI et le rapport de recette sont contrôlés",
      "npm audit sans high/critical et une revue de sécurité outillée sont bloquants, avec CSP sans unsafe-inline sur les deux familles de pages",
    ),
    () => {
      const workflow = read(".github/workflows/ci.yml")
      expect(workflow).toMatch(/run:\s*npm audit(?:\s|$)/iu)
      expect(workflow).not.toMatch(
        /npm audit[^\n]*--audit-level=(?:critical|none)/iu,
      )
      expectReleaseEvidence(releaseEvidence(), [
        /npm audit[\s\S]{0,100}(?:0|zéro)[\s\S]{0,50}high[\s\S]{0,50}(?:0|zéro)[\s\S]{0,50}critical/iu,
        /revue de sécurité[\s\S]{0,100}(?:passée|réussie|aucun bloquant)/iu,
        /page publique[\s\S]{0,120}page protégée/iu,
        /CSP[\s\S]{0,80}(?:sans|aucun)[\s\S]{0,40}unsafe-inline/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD et cible Vercel — un clone frais suit la voie de production serverless sans étape cachée",
      "une machine vierge, Vercel comme cible et PostgreSQL distant",
      "README, configuration Prisma et CI de recette sont inspectés",
      "clone, installation, migrate deploy, seed et démarrage sont reproductibles, et une stratégie de pooling serverless est documentée et validée",
    ),
    () => {
      const evidence = releaseEvidence()
      expectReleaseEvidence(evidence, [
        /git clone/iu,
        /npm (?:install|ci)[\s\S]{0,200}prisma migrate deploy[\s\S]{0,200}prisma db seed/iu,
        /Vercel/iu,
        /(?:pooling|pooler|PgBouncer|Accelerate|Neon)/iu,
        /DATABASE_URL[\s\S]{0,120}(?:pool|serverless)/iu,
        /(?:clone frais|machine propre)[\s\S]{0,120}(?:réussi|validé|PASS)/iu,
      ])
      expect(read(".github/workflows/ci.yml")).toMatch(/prisma migrate deploy/u)
    },
  )

  it(
    scenario(
      "Décision d'exploitation — sauvegarde active et restauration vérifiable bloquent la mise en ligne",
      "une base PostgreSQL destinée au premier déploiement",
      "la documentation de lancement et la preuve de restauration sont inspectées",
      "la sauvegarde active est un prérequis bloquant et une restauration testée consigne source, cible, commandes, contrôles et date",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /sauvegarde[\s\S]{0,100}(?:prérequis|bloquant)/iu,
        /sauvegarde[\s\S]{0,100}(?:active|activée)/iu,
        /restauration[\s\S]{0,120}(?:procédure|commande)/iu,
        /restauration[\s\S]{0,160}(?:base cible|environnement isolé|base temporaire)/iu,
        /restauration[\s\S]{0,200}(?:vérifiée|testée|réussie)/iu,
      ])
    },
  )

  it(
    scenario(
      "DoD et piège — le hors-v1 est écrit, assumé et sans point suspendu",
      "la liste explicite de la tranche et la décision d'enchaîner sur l'administration",
      "la documentation produit candidate est inspectée",
      "paiement réel, e-mails, administration v1, jeux exécutés, recherche avancée, OAuth, suppression/export, upload, thème sombre, PWA et contact restent explicitement hors v1, l'administration venant ensuite",
    ),
    () => {
      const evidence = releaseEvidence()
      for (const expected of [
        /paiement réel/iu,
        /e-mails?/iu,
        /interface d['’]administration/iu,
        /déroulement des jeux/iu,
        /recherche avancée/iu,
        /OAuth/iu,
        /suppression de compte[\s\S]{0,80}export/iu,
        /upload/iu,
        /thème sombre/iu,
        /PWA/iu,
        /formulaire de contact/iu,
        /administration[\s\S]{0,100}(?:en premier|prochaine|suite)/iu,
        /paiement[\s\S]{0,80}(?:ultérieur|plus tard|v2)/iu,
      ]) {
        expect(evidence).toMatch(expected)
      }
      expect(evidence).not.toMatch(
        /(?:TODO|à trancher|en attente)[^\n]*(?:v1|mise en ligne)/iu,
      )
    },
  )

  it(
    scenario(
      "Écarts E10 et E11 — aucune voie publique n'accorde PREMIUM et ressources reste absent de tout l'historique Git",
      "le script administratif tracé et l'historique complet de la candidate",
      "les routes publiques, les objets Git et la preuve de recette sont inspectés",
      "grantPremium n'est appelé que depuis le script d'administration, aucun objet ressources/ n'existe et les deux audits sont consignés",
    ),
    () => {
      const applicationSearch = spawnSync(
        "git",
        [
          "grep",
          "-n",
          "grantPremium",
          "--",
          "src/app",
          "src/components",
          "src/lib",
          "src/hooks",
        ],
        { cwd: ROOT, encoding: "utf8" },
      )
      expect(applicationSearch.status).toBe(1)
      expect(applicationSearch.stdout).toBe("")
      expect(applicationSearch.stderr).toBe("")
      const objects = execFileSync("git", ["rev-list", "--all", "--objects"], {
        cwd: ROOT,
        encoding: "utf8",
      })
      expect(objects).not.toMatch(/(?:^|\s)ressources\//mu)
      expectReleaseEvidence(releaseEvidence(), [
        /grantPremium[\s\S]{0,100}(?:aucune voie publique|script d['’]administration)/iu,
        /git[\s\S]{0,100}ressources\/[\s\S]{0,100}(?:absent|aucun)/iu,
      ])
    },
  )

  it(
    scenario(
      "Performance et accessibilité — la recette publie des mesures et non une impression",
      "le vrai volume, un bridage 3G lent et les listes denses à 390px",
      "le rapport de recette mobile est inspecté",
      "temps liste/détail, poids pages/images, N+1, cache session, clavier, labels, AA, 44px, titres et textes alternatifs ont chacun une preuve",
    ),
    () => {
      expectReleaseEvidence(releaseEvidence(), [
        /3G lent/iu,
        /liste[\s\S]{0,80}\d+[\s\S]{0,20}ms/iu,
        /détail[\s\S]{0,80}\d+[\s\S]{0,20}ms/iu,
        /poids[\s\S]{0,80}(?:ko|kB|octets?)/iu,
        /N\+1[\s\S]{0,100}(?:absent|aucun|0)/iu,
        /cache[\s\S]{0,100}(?:session|authentifié)[\s\S]{0,80}(?:no-store|désactivé)/iu,
        /navigation clavier/iu,
        /labels? associés?/iu,
        /contraste AA/iu,
        /44\s*(?:px|×)/iu,
        /structure de titres/iu,
        /textes? alternatifs?/iu,
      ])
    },
  )

  it(
    scenario(
      "Pièges de recette — chaque défaut corrigé garde un test et aucun détail n'est laissé ouvert",
      "les constats accumulés pendant la recette",
      "la matrice d'écarts et la checklist de sortie sont inspectées",
      "chaque correction cite son test de non-régression et la checklist finale ne contient ni case non cochée ni point bloquant ouvert",
    ),
    () => {
      const evidence = releaseEvidence()
      expectReleaseEvidence(evidence, [
        /correctifs? de recette/iu,
        /test de non-régression/iu,
        /(?:fichier|test)\s*:\s*tests\//iu,
        /DoD[\s\S]{0,120}(?:complète|100\s*%|toutes les cases)/iu,
        /hors[- ]v1[\s\S]{0,80}(?:communiqué|assumé)/iu,
      ])
      expect(evidence).not.toMatch(/^- \[ \].*$/mu)
      expect(evidence).not.toMatch(
        /(?:BLOQUANT|MAJEUR)[^\n]*(?:ouvert|en attente)/iu,
      )
    },
  )
})
