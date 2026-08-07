# Journal — tranche 01 : Fondations et outillage

- Démarrée le : 2026-08-07 / Terminée le : — / Statut : BLOQUÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 00 est méthodologique et ne contient aucune tâche de développement.

Écarts des journaux précédents pris en compte : aucun journal précédent, donc aucun écart ouvert.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|
| Hébergement cible | Vercel | Porteur du projet, dans la tranche 01 |
| Nom du package et dépôt Git | Package `synapse` ; dépôt Git déjà initialisé | Porteur du projet, dans la tranche 01 ; nom constaté depuis le dépôt Synapse |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : depuis un environnement frais, installer les dépendances, démarrer PostgreSQL 16, appliquer Prisma sans modèle, lancer l'application et afficher sur 390 px une page d'accueil stylée avec Tailwind ; la chaîne de qualité et la CI doivent être vertes.

Périmètre : initialisation Next.js 15 avec TypeScript strict renforcé ; arborescence prescrite ; ESLint, Prettier, Vitest, Testing Library et Playwright ; PostgreSQL 16 et Prisma sans modèle ; singleton Prisma ; validation Zod de l'environnement au chargement ; Tailwind mobile-first, shadcn/ui et tokens ; workflow GitHub Actions et garde-fou de la pipeline ; documentation de démarrage.

Hors périmètre : modèles métier, migrations métier, authentification, entitlement premium, fonctionnalités de rubriques, composants métier, paiement, sécurité transverse réservée à la tranche 03 et toute capacité des tranches 02 à 12.

DoD commune applicable : livrable navigateur à 390 px ; qualité complète verte ; règles TypeScript, architecture et secrets respectées ; reproductibilité depuis zéro ; documentation et conventions conformes. Les exigences de tests repository/service/Route Handler, de quatre états métier, de contenu gated et d'isolation cross-user ne sont pas applicables à ce socle sans modèle, service, handler métier ni ressource utilisateur.

DoD spécifique : isolation `server-only` prouvée par un build négatif temporaire ; variable d'environnement manquante prouvée au démarrage ; CI validée sur une PR réelle ; garde-fou pipeline validé sur une PR de test puis annulé ; README complet.

Pièges retenus comme cas de test : options TypeScript strictes renforcées ; singleton Prisma HMR ; lecture centralisée et immédiate de l'environnement ; CI verte dès la fondation.

## Tests

Gelés le 2026-08-07 après revue du chef-projet. La phase RED couvre 22 comportements : 20 tests exécutés et rouges, plus un test Testing Library et un test Playwright rouges à la collecte faute d'outillage encore installé.

- `tests/contracts/foundations.test.ts` — projet Next/TypeScript, arborescence, scripts, PostgreSQL, Prisma sans modèle, singleton HMR, frontière d'environnement, fichiers `.env` — SHA-256 `b1d1197837efc4a245a243647661c5318e8b9710ef23c7cda5966c42ca2fab78`.
- `tests/contracts/quality-ui-ci.test.ts` — règles ESLint, qualité commune, Tailwind/tokens, shadcn/ui, CI ordonnée, PostgreSQL CI, audit non bloquant, garde-fou pipeline, README reproductible — SHA-256 `d28b10b48e0ee93c8492fb1cc5192babbc348888277b63bb9923f0aca3ae224d`.
- `tests/contracts/server-boundary.test.ts` — build négatif d'un composant client important `db.ts` — SHA-256 `aac1ef43ca0a2aa8c072a1cc939533919fe2027d519dfd0f3650859cef2e1635`.
- `tests/server/config.test.ts` — échec immédiat sans `DATABASE_URL` et parsing valide au chargement — SHA-256 `c3d1a24263fc1e1eba3a6fb8d401ed6941ce197f23d615582711d38f3e4fb26d`.
- `tests/components/home-page.test.tsx` — page réelle via Vitest + Testing Library — SHA-256 `9182812bce36e76c1774adebb8d26971a252c6eedca83991fc9e26dd576e8c95`.
- `tests/e2e/home.spec.ts` — livrable à 390 px via Playwright — SHA-256 `d82ab32e04da4a755aa974b8b64a01f42d14756d073b588c4ceec0da70cf88b7`.
- Fixture de frontière : `package.json` `d97425242cfa2c8338a066e9763d75090ca172a1370ad8dd7b2936b513941ce2`, `tsconfig.json` `aab1ca9a2bb7d2467591e4cc653d8878d76f6c7b53c2273e041ff2188092d6e9`, `layout.tsx` `0cc667217abda8656ed45c3e0ef36cc7b44771cd554c127ab3ecdf83a6f2c0a7`, `page.tsx` `ba2d5477c795bd5566300f58edd8b38de9b6f8153742da9531e0ea3b22aab74d`.

Revue : chaque DoD spécifique a une couverture ; le livrable a son E2E ; les quatre pièges ont une non-régression ; aucun code applicatif ni test hors périmètre n'a été écrit ; aucun test ne dépend d'une hypothèse non arbitrée. Les niveaux repository, service et Route Handler ne sont pas applicables avant le walking skeleton de la tranche 02.

Limite de preuve connue : aucun remote Git n'est configuré. Les deux validations exigeant une PR réelle devront être exécutées sur le dépôt distant avant la recette finale ; les tests locaux ne prouvent que la structure du workflow et du garde-fou.

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| 1 | BLOQUANT : la validation de `DATABASE_URL` n'était pas reliée au démarrage. MAJEUR : `tests/**` était ignoré par ESLint. BLOQUANT externe : aucune PR réelle vérifiable. | Validation branchée au démarrage et au build ; tests inclus dans ESLint avec exception ciblée pour la fixture négative. Le blocage externe n'a pas été contourné. |
| 2 | MAJEUR : `process.env` était lu à la fois dans `next.config.ts` et `src/server/config.ts`. | `src/server/config.ts` redevient l'unique lecteur des variables applicatives ; démarrage et build continuent d'échouer sans `DATABASE_URL`. Ré-audit local propre. |

## Décisions d'implémentation

- La demande d'un « test bidon qui passe » est satisfaite par un vrai test minimal de la page d'accueil avec Vitest et Testing Library : il est rouge tant que le socle n'existe pas, puis doit passer en GREEN. Un `expect(true).toBe(true)` aurait contredit l'obligation RED sans mieux valider la chaîne.
- Next.js a été porté à `16.3.0`, compatible avec l'exigence `15+`, car Next 15 laissait trois vulnérabilités transitives de gravité haute. Node `>=20.9.0` est déclaré et documenté ; `npm audit` ne remonte plus aucune vulnérabilité.
- La validation Zod de l'environnement est déclenchée par l'instrumentation au démarrage et par le layout serveur au build, tout en gardant `src/server/config.ts` comme unique lecteur de l'environnement applicatif.
- ESLint couvre le code applicatif et les tests ; seule la fixture qui importe volontairement un module serveur depuis un composant client reçoit une exception ciblée sur l'import profond nécessaire à son test négatif.

## Écarts

### Écart ouvert — preuves sur PR réelle impossibles

Constat factuel : le dépôt local est sur la branche `master`, ne contient aucun commit et n'a aucun remote. `git remote -v` et `git log --oneline` ne fournissent aucune cible ; `origin/main` n'existe donc pas.

En quoi la tranche est infaisable telle qu'écrite dans cet environnement : deux cases de DoD spécifique exigent une CI verte sur une PR réelle, puis une PR de test modifiant `docs/pipeline-dev/` dont la CI échoue. Sans dépôt distant ni branche `main`, aucune PR ni exécution GitHub Actions réelle ne peut être créée ou observée.

Proposition soumise à validation humaine : fournir l'URL du dépôt distant et autoriser la création/poussée des commits et branches nécessaires ; exécuter une PR normale, puis une branche de test modifiant temporairement un fichier de pipeline, constater l'échec du garde-fou, et supprimer/fermer cette branche sans fusionner la modification de pipeline.

Tranches impactées : la tranche 02 ne peut pas satisfaire sa Definition of Ready tant que la tranche 01 n'est pas validée.

Tentatives effectuées : contrôle de `git status`, `git branch --show-current`, `git remote -v`, `git log --oneline`, vérification statique du workflow et de son garde-fou, exécution locale intégrale de la chaîne.

Mise à jour du 2026-08-07 : le porteur a fourni `https://github.com/Danii15321/Synapse.git` et autorisé le remplacement complet du contenu distant ainsi que la création des branches et PR de validation. L'ancienne branche `main` (`147d9b7`) a été remplacée, avec lease explicite, par le nouveau commit racine `9362850`. Aucune autre branche ni aucun tag distant n'existait. L'écart reste ouvert uniquement jusqu'aux deux preuves de PR réelle.

## Validation finale

Audit final local : propre après deux tours, sans constat local BLOQUANT, MAJEUR ou MINEUR ouvert. Les dix empreintes des tests et fixtures correspondent au gel ; aucun fichier de test ni de pipeline n'a été modifié par les agents.

- [x] `npm run lint` relancé par le chef-projet : vert.
- [x] `npm run type-check` relancé par le chef-projet : vert.
- [x] `npm run test` relancé par le chef-projet : 5 fichiers, 21 tests verts.
- [x] `npm run build` relancé par le chef-projet : vert avec Next.js 16.3.0.
- [x] `npm run e2e` relancé par le chef-projet : 1 test vert à 390 px.
- [x] `npm audit --audit-level=high` relancé par le chef-projet : 0 vulnérabilité.
- [x] Livrable ouvert dans un navigateur à 390 × 844 : titre « Le socle est prêt. », contenu principal visible, styles appliqués, largeur de document 390 px pour un viewport de 390 px.
- [x] PostgreSQL 16, `prisma migrate dev` et `prisma db seed` vérifiés par l'audit ; aucune correction ultérieure ne les a affectés.
- [x] Échec de `next dev` et `next build` sans `DATABASE_URL`, avec message Zod nommant la variable.
- [x] Build négatif de la frontière `server-only` vérifié.
- [ ] CI verte sur une PR réelle — branche `validation/tranche-01-ci` préparée, résultat en attente.
- [ ] PR de test modifiant `docs/pipeline-dev/` rejetée par la CI — à exécuter après la PR verte.
- [x] Commit racine Conventional Commit : `9362850 feat(infra): initialiser les fondations du projet`.

Rapport d'audit : premier passage non conforme avec deux constats locaux et un blocage externe ; tour 1 referme les deux constats et découvre une lecture d'environnement dupliquée ; tour 2 referme ce dernier constat et déclare l'audit local propre. Le blocage externe de PR réelle reste ouvert.
