# Journal — tranche 02 : Walking skeleton

- Démarrée le : 2026-08-07 / Terminée le : — / Statut : EN COURS

## Definition of Ready

Tranche précédente validée : oui — la tranche 01 est terminée, sa DoD commune et spécifique est satisfaite, et son écart est résolu.

Écarts des journaux précédents pris en compte : l'écart de la tranche 01 sur les preuves GitHub est clos et n'impacte plus la tranche 02.

### Relevé de décisions — à transmettre aux trois agents

| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|
| Nommage des URL publiques | `/prompts`, `/formations`, `/jeux`, `/opportunites` | Porteur du projet, réponse locale « Je valide les noms » constatée le 2026-08-07 |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : après migration et seed rejouable, `/prompts` affiche à 390 px deux prompts lus depuis PostgreSQL à travers la page Server Component, le service et le repository ; l'API `GET /api/prompts` expose le même DTO pour le chemin client.

Périmètre : modèle Prisma `Prompt` minimal ; migration `add_prompt` ; seed de deux prompts par `upsert` ; repository borné avec `select` explicite ; service de mapping ; Route Handler GET ; `lib/api.ts` comme unique point de `fetch` client ; page publique Server Component ; tests repository, service, API et E2E.

Hors périmètre : authentification et sessions ; utilisateur ; premium et `visibility` ; `body` et `tags` ; pagination fonctionnelle, recherche et filtres ; design abouti ; page de détail ; tout travail des tranches 03 à 12.

DoD commune applicable : parcours navigateur à 390 px ; états explicites applicables ; non-régression de la tranche 01 ; lint, types, tests et build verts ; architecture en couches ; vraie base repository ; validation, secrets, audit et reproductibilité conformes.

DoD spécifique : quatre niveaux de tests ; repository sur PostgreSQL en CI ; page sans `"use client"` ; chemins Server Component → service et client → handler fonctionnels ; seed rejouable sans doublon.

Pièges retenus comme cas de test : aucun `fetch` interne depuis la page ; aucun mock Prisma pour le repository ; modèle strictement limité aux six champs prescrits ; seed par `upsert` et seconde exécution sûre.

## Tests

Phase RED terminée le 2026-08-07. Les 21 tests hérités de la tranche 01 restent verts. Les 19 nouveaux tests sont rouges pour les seules raisons attendues : modules de la tranche absents, contrats non satisfaits et routes encore en 404. Le test E2E confirme aussi le rouge sur `GET /api/prompts` et sur le refus attendu de `POST /api/prompts`.

Arbitrage avant gel : le test de tranche 01 « Prisma est initialisé sans modèle métier » contenait l'assertion temporaire `schema` sans aucun `model`, désormais en contradiction directe avec la tranche 02 qui impose `model Prompt`. Le chef-projet a rappelé l'agent de tests et l'a autorisé à retirer uniquement cet invariant devenu obsolète, en conservant les contrôles durables du generator, du datasource PostgreSQL et de `DATABASE_URL`. Le modèle minimal de tranche 02 doit recevoir ses propres tests stricts.

### Gel des tests

Les tests ci-dessous sont gelés après revue du périmètre et preuve RED. L'agent d'implémentation n'est autorisé à en modifier aucun.

| Fichier | SHA-256 |
|---|---|
| `tests/contracts/foundations.test.ts` | `08f9676f0c72ce8f869ffbc31ea6de8037a5a36bd4f2e6964dd2fa8bfc9b75bf` |
| `tests/contracts/walking-skeleton.test.ts` | `af0d45c498c94fea8942c17479f31a01769023b59e1a9b566583fa2225532925` |
| `tests/repositories/prompt-repository.test.ts` | `1ba1dd065e6e0d5762af1c3d819f21ba9436861825bab87aa1d887e1a3a06cad` |
| `tests/services/prompt-service.test.ts` | `fd952421c4e74ff7f9ed2420d1396dd5cba04bc30f543de06343bf960876222b` |
| `tests/api/prompts-route.test.ts` | `5dc71c846ef4a94c6f5269affda45e70422222799b5736ef4e7158f62aea062f` |
| `tests/components/prompts-page.test.tsx` | `316cf938a3e075b051af7966d38bc54f5267081ef4ddd482aa07f15a3c486120` |
| `tests/e2e/prompts.spec.ts` | `b222b5b196ea7447bd8b118c3f2a911829e01459088a78dba6c38fab6324c871` |

Contestations après gel : l'agent d'implémentation a constaté que le scénario d'écran `empty` héritait du DOM du scénario `success` et échouait avec deux éléments `<main>`. Le fichier de tranche exige des états indépendants ; il n'exige pas une fuite d'état entre tests. Le chef-projet a donc qualifié le défaut comme une erreur d'isolation du test et a rappelé le même agent de tests pour ajouter uniquement le nettoyage entre scénarios. L'implémentation n'a touché à aucun test et s'est arrêtée conformément au protocole. Le test corrigé a été copié dans une archive isolée de `origin/main` : il reste rouge sur l'import inexistant de la page, ce qui rétablit la preuve RED. ESLint et Prettier ciblés sont verts. Son nouveau SHA-256, reporté dans le tableau, constitue le second gel ; les six autres empreintes sont inchangées.

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| 1 | Audit initial conforme : aucun constat bloquant, majeur ou mineur. | Aucune correction nécessaire. |

## Décisions d'implémentation

- Migration Prisma générée sous `20260807190702_add_prompt` et verrou PostgreSQL versionné.
- Seed limité à deux prompts codés en dur, chacun écrit par `upsert` sur le slug.
- Repository borné et à sélection explicite ; service responsable du mapping vers le DTO ; handler responsable de HTTP ; `src/lib/api.ts` seul point de `fetch` client.
- Page `/prompts` en Server Component avec états `loading`, `error`, `empty` et `success` explicites ; composant `PromptCard` sans logique d'accès.
- CI étendue pour appliquer la migration, jouer le seed et exécuter l'E2E sur PostgreSQL réel. README complété pour documenter les deux chemins Server Component → service et client → handler.

Phase GREEN terminée le 2026-08-07 après le second gel. Rapport de l'agent d'implémentation : lint vert ; type-check vert ; 10 fichiers et 38 tests Vitest verts ; build vert ; 3 tests Playwright verts ; audit npm à 0 vulnérabilité ; Prettier ciblé vert. Les sept empreintes gelées et l'intégrité de `docs/pipeline-dev/` ont été revérifiées par le chef-projet avant audit.

## Écarts

### Blocage de gouvernance résolu — pipeline modifiée avant démarrage

Constat factuel : `git diff origin/main -- docs/pipeline-dev/02-walking-skeleton.md` montre deux lignes locales ajoutées sous « À trancher » : `> Ma réponse :` et `Je valide les noms`. La modification n'a pas été faite par le chef-projet ni par un agent de cette tranche.

La décision produit est préservée dans le relevé ci-dessus, mais la tranche ne peut pas démarrer tant que le fichier contractuel diffère de `origin/main`.

Décision humaine : le porteur a autorisé la restauration ciblée. `docs/pipeline-dev/02-walking-skeleton.md` a été restauré depuis `origin/main` ; la réponse reste durablement consignée dans ce journal. Pendant RED, le fichier a été réécrit une seconde fois par une source concurrente, ajoutant `> je valide les noms`. L'agent de tests a immédiatement suspendu son travail et signalé le diff ; le chef-projet a appliqué la même restauration autorisée. `git diff origin/main -- docs/pipeline-dev/` est de nouveau vide. Une troisième occurrence déclenchera la règle d'arrêt. Le blocage est clos et n'impacte plus la tranche 02.

## Validation finale

Audit indépendant : **CONFORME**, sans constat ouvert. L'auditeur a revérifié les sept empreintes gelées, l'absence de diff pipeline, PostgreSQL 16, une migration sur base fraîche, le double seed à `2` lignes et `2` slugs distincts, une installation isolée, les réponses HTTP brutes et l'absence de fuite d'erreur Prisma. Sa chaîne réelle est verte : 38 tests Vitest, build, 3 E2E et audit npm sans vulnérabilité.

Recette relancée par le chef-projet le 2026-08-07 avec la valeur factice documentée dans `.env.example` :

- `prisma migrate deploy`, puis seed exécuté deux fois : verts ;
- `npm run lint` : vert ;
- `npm run type-check` : vert ;
- `npm run test` : 10 fichiers, 38 tests verts ;
- `npm run build` : vert ;
- `npm audit --audit-level=high` : 0 vulnérabilité ;
- `npm run e2e` : 3 tests verts, incluant la non-régression de l'accueil ;
- navigateur réel à `390 × 844` : `/prompts` affiche les deux titres et résumés, un seul `<main>`, deux `<article>`, largeur document `390`, aucun débordement horizontal ;
- états `loading`, `error`, `empty` et `success` couverts par les tests d'écran ;
- DoD commune et DoD spécifique satisfaites localement ; preuve CI distante encore à recueillir avant clôture.
