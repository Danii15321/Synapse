# 01 — Fondations et outillage

> **Nature :** socle · **Dépend de :** rien · **Prépare :** toutes les tranches

---

## Objectif

Mettre en place le projet, la chaîne de qualité et l'infrastructure locale, de sorte que **la tranche 02 puisse écrire du code sans jamais s'arrêter sur un problème d'outillage**.

## Pourquoi ici

Dépendance pure : rien ne peut commencer avant. Le risque traité est classique et coûteux — un outillage approximatif (types non stricts, CI absente, base locale bricolée) ne se révèle qu'au moment où il est le plus cher à corriger, c'est-à-dire quand le code est déjà écrit.

---

## Contenu

### Projet et langage
- Initialiser Next.js 15 (App Router, TypeScript, dossier `src/`, alias `@/*`).
- `tsconfig.json` : `strict: true`, plus `noUncheckedIndexedAccess` et `noImplicitOverride`. Ces deux options ne sont pas dans le défaut Next et attrapent des bugs réels ; les activer plus tard revient à corriger tout le code d'un coup.
- Installer `server-only` et vérifier qu'un import de `src/server/` depuis un composant client **casse effectivement le build**. C'est une garantie qui doit être testée maintenant, pas supposée.

### Structure
- Créer l'arborescence exacte décrite dans [AGENTS.md](../../AGENTS.md#architecture), dossiers vides compris (`server/services/`, `server/repositories/`, `server/access/`, `server/errors/`, `lib/validators/`…).
- Un `.gitkeep` par dossier vide, pour que la structure soit versionnée et donc contraignante.

### Qualité
- ESLint (config Next + `@typescript-eslint`) et Prettier, avec les règles qui font respecter AGENTS.md : interdiction de `any`, de `console.log`, des imports relatifs profonds.
- Vitest + Testing Library, avec un test bidon qui passe.
- Playwright, avec un test bidon qui ouvre la page d'accueil.
- Scripts npm : `dev`, `build`, `lint`, `type-check`, `format`, `test`, `e2e`.

### Base de données
- `docker-compose.yml` avec **PostgreSQL 16 uniquement** (pas de Redis, pas d'autre service — voir AGENTS.md).
- `prisma init`, `schema.prisma` avec le datasource et le generator, **sans aucun modèle** — les modèles arrivent en tranche 02.
- Vérifier que `npx prisma migrate dev` se connecte bien au conteneur.
- Singleton `PrismaClient` dans `src/server/db.ts`, avec le cache sur `globalThis` qui protège du HMR.

### Configuration
- `src/server/config.ts` : schéma Zod de toutes les variables d'environnement, parsé **au chargement du module**. Une variable manquante doit faire échouer le démarrage, pas la première requête.
- `.env.example` versionné avec des valeurs factices, `.env*` dans `.gitignore`.

### UI
- Tailwind CSS configuré **mobile-first**, breakpoints alignés sur AGENTS.md.
- shadcn/ui initialisé, avec deux ou trois composants de base (`Button`, `Card`, `Input`) pour valider la chaîne.
- **Tokens de design** dans la configuration Tailwind : palette (fond, surface, texte, accent, sémantiques succès / erreur / avertissement), échelle typographique, échelle d'espacement, rayons, ombres.

Les tokens sont posés **ici**, sur un projet vide, alors que l'identité visuelle n'est mise en œuvre qu'en tranche `06`. La raison est mécanique : les écrans des tranches `02` à `05` s'écrivent entre-temps. Sans vocabulaire commun dès maintenant, ils accumulent des valeurs en dur qu'il faudra toutes reprendre. Poser le vocabulaire coûte une heure ; le rétrofiter coûte un restylage complet.

Ce ne sont **que** des tokens : aucune décision de mise en page, aucun composant métier.

### CI
- GitHub Actions : `lint` → `type-check` → `test` → `build`, sur chaque push et chaque PR.
- Un service PostgreSQL dans le workflow, pour que les tests de repository des tranches suivantes tournent sans modification du pipeline.
- `npm audit` en étape non bloquante pour l'instant, bloquante à partir de la tranche `03`.
- **Garde-fou sur la pipeline** : une étape bloquante qui échoue si une PR touche `docs/pipeline-dev/`. Une ligne suffit — `git diff --name-only origin/main... | grep -q '^docs/pipeline-dev/' && exit 1`. La discipline est portée par le skill [chef-projet](../../.claude/skills/chef-projet/SKILL.md), mais une vérification mécanique rend la violation **visible** au lieu de compter sur la bonne volonté.

---

## Livrable démontrable

`npm run dev` affiche une page d'accueil stylée en Tailwind sur 390px, la CI est verte sur une PR de test, et `docker compose up -d postgres && npx prisma migrate dev` s'exécute sans erreur depuis un clone frais.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Un import volontaire de `src/server/db.ts` depuis un composant `"use client"` fait **échouer** `npm run build` (vérifié une fois, puis retiré).
- [ ] Supprimer une variable de `.env` fait **échouer le démarrage** avec un message qui nomme la variable manquante.
- [ ] La CI tourne sur une PR réelle, pas seulement en local.
- [ ] Une PR de test qui modifie un fichier de `docs/pipeline-dev/` fait **échouer la CI** (vérifié une fois, puis annulé).
- [ ] `README.md` documente les commandes de démarrage depuis zéro.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Se contenter du `strict` par défaut de Next | `noUncheckedIndexedAccess` activé plus tard casse des dizaines de fichiers | Tout activer maintenant, sur un projet vide |
| `PrismaClient` instancié à l'import dans plusieurs fichiers | Pool épuisé au bout de quelques rechargements en dev | Singleton `globalThis` dès le premier jour |
| Variables d'env lues via `process.env` un peu partout | Fuite dans le bundle, erreur au runtime en production | `config.ts` seul point de lecture, `process.env` interdit ailleurs |
| CI ajoutée « quand le projet sera stable » | Elle ne sera jamais verte du premier coup | Elle doit être verte quand il n'y a encore rien à casser |

---

## À trancher

- **Hébergement cible.** Vercel ou VPS ? Sans conséquence sur la v1 locale, mais ça oriente la configuration de la CSP et le mode de connexion Prisma (pooling). Peut attendre la tranche `12`. 
> Ma réponse : Hebergement Vercel
- **Nom du package et du dépôt Git.** Le projet n'est pas encore un dépôt Git — à initialiser au début de cette tranche.
> Ma réponse : C'est fait 