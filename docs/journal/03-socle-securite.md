# Journal — tranche 03 : Socle de sécurité transverse

- Démarrée le : 2026-08-07 / Terminée le : 2026-08-07 / Statut : TERMINÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 02 est terminée, fusionnée sur `main`, auditée et sa CI post-fusion est verte.

Écarts des journaux précédents pris en compte : l'écart distant de la tranche 01 et le blocage de gouvernance de la tranche 02 sont clos. Aucun ne change le périmètre technique de la tranche 03. Le blocage récurrent de modification locale de la pipeline est toutefois de nouveau constaté ci-dessous.

Questions « À trancher » : toutes résolues dans le relevé ci-dessous. Journal créé et pipeline vérifiée identique à `origin/main` après l'autorisation humaine consignée dans l'écart. La Definition of Ready est satisfaite.

### Relevé de décisions — à transmettre aux trois agents

| Question « À trancher »          | Réponse retenue                                                                                                                                                                                                                                        | Tranchée par                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Identification du rate limiting  | IP seule en tranche 03 ; raffinement IP + utilisateur en tranche 04 sans changer la structure                                                                                                                                                          | Porteur du projet, réponse locale « J'accepte la recommandation » constatée le 2026-08-07                                    |
| Destination des logs en v1       | `stdout` en local et en v1 ; décision d'agrégation reportée au déploiement en tranche 12                                                                                                                                                               | Porteur du projet, réponse locale « Idem » constatée le 2026-08-07                                                           |
| Source de l'IP derrière le proxy | En production Vercel uniquement, faire confiance à `X-Forwarded-For`, que Vercel remplace par l'IP publique du client ; hors Vercel, ignorer tout en-tête client et utiliser un compartiment fixe, fermé au contournement, réservé au local et à la CI | Déduction technique de la cible Vercel décidée en tranche 01, vérifiée dans la documentation officielle Vercel le 2026-08-07 |
| Sortie du blocage nonce CSP      | Autorisation d'une tentative ciblée supplémentaire : rendre le layout ou `/prompts` dynamique pour permettre à Next.js de propager le nonce, puis reprendre la validation E2E                                                                          | Porteur du projet, réponse « vas y » du 2026-08-07                                                                           |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : sur `/prompts`, les headers de sécurité et une CSP stricte avec nonce sont présents sans casser le rendu ; une rafale de 70 requêtes vers `/api/prompts` dépasse le régime général et reçoit `429` avec `Retry-After` ; une erreur provoquée produit une réponse générique avec `errorId`, corrélable à un log JSON expurgé de toute donnée sensible.

Périmètre : headers HSTS, nosniff, DENY, CSP sans `unsafe-inline` ni `unsafe-eval`, Referrer-Policy et Permissions-Policy ; nonce par requête ; compteur PostgreSQL et migration de rate limiting ; régimes 60/min et 10/min ; purge des fenêtres expirées ; hiérarchie d'erreurs domaine et mapping HTTP central ; logger JSON avec liste de champs rédigés ; helper Zod `.strict()` pour les bodies ; pages `error` et `not-found` mobiles ; `npm audit` bloquant en CI.

Hors périmètre : authentification, session et identification par utilisateur ; entitlement premium ; paiement ; agrégateur externe de logs ; Redis ou autre infrastructure ; fonctionnalités métier des tranches 04 à 12.

DoD commune applicable : non-régression de l'accueil et de `/prompts` à 390 px ; quatre états des écrans touchés ; lint, types, tests et build verts ; vraie PostgreSQL pour le repository du compteur ; frontières Zod ; zéro secret et zéro vulnérabilité haute/critique ; reproductibilité et commits conventionnels.

DoD spécifique : chaque header testé ; `429` puis relâchement après fenêtre ; aucune fuite de stack ou message Prisma ; CSP stricte et application fonctionnelle simultanément ; audit npm bloquant en CI.

Pièges retenus comme cas de test : absence absolue de `unsafe-inline` et `unsafe-eval` ; `X-Forwarded-For` ignoré tant qu'aucun proxy de confiance n'est garanti ; mapping d'erreur générique unique ; logger par liste de champs filtrés ; purge effective des lignes expirées.

## Tests

Phase RED terminée. L'agent de tests a signalé que Next.js 16 n'expose pas directement l'adresse de connexion dans `NextRequest`. L'arbitrage ci-dessus fixe le contrat testable sans accorder de confiance à une valeur contrôlée par le client hors de l'environnement Vercel.

18 tests de tranche couvrent : persistance et purge PostgreSQL du compteur ; seuils général et sensible ; relâchement après fenêtre ; résolution IPv4/IPv6 Vercel et repli local fermé au contournement ; hiérarchie d'erreurs et mapping HTTP ; logs JSON avec rédaction récursive ; parsing JSON Zod strict ; réponse d'erreur API générique et corrélée ; pages erreur/404 mobiles ; audit npm bloquant ; livrable E2E à 390 px avec tous les headers, nonce par requête, hydratation, 70 requêtes, `429` et `Retry-After`.

Preuve RED rejouée par le chef-projet avec PostgreSQL 16 : 17 échecs Vitest attendus et 37 tests antérieurs verts. Le scénario Playwright ciblé échoue avant implémentation sur l'absence de `Strict-Transport-Security`. Les échecs correspondent aux modules ou comportements de tranche absents ; aucun test existant ne régresse.

### Gel des tests — empreintes SHA-256

```text
769f6df32e2a2b4c166ce4c94d8e3d497a8815b26892d64e850da79b726f2810  tests/repositories/rate-limit-repository.test.ts
910acb7e21a728acdfbd6f2ec8c124605447056a6db8ed360d3b323691cd584c  tests/services/rate-limit-service.test.ts
348735717b13ca43e5662b64842faf1fb90c80d57b204d2007e82d268b4b771b  tests/services/client-identifier.test.ts
6fccfefec813dfcd12dcebeaf93bafa8ad572a55631acfdeb0c621564e2d11b1  tests/services/security-foundations.test.ts
d62076800001a8b7f68073bf8038ceda467cf6b10a7e1062dd37c9bb360a50ca  tests/api/security-errors-route.test.ts
13f5a97d4d10e561fdfc6d86c77881249161fe028da9e12e15c620df05b93274  tests/components/security-error-pages.test.tsx
f6629d5411c0c2c1cd2f9b18543a61388cd26103b60d8a29aecb12741f651b00  tests/e2e/security.spec.ts
73866715cffd43caab0b74fb6f95557f7a53ce4d7d4e2e486c150500ba51aeec  tests/contracts/quality-ui-ci.test.ts
```

À compter de ce gel, l'agent d'implémentation ne peut modifier aucun fichier de test. Toute variation d'empreinte arrête la tranche et revient au chef-projet.

## Itérations audit ↔ implémentation

| #                                | Constats renvoyés                                                                                                                                                                                                                                                                 | Ce qui a été corrigé                                                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pré-audit GREEN 1                | Le middleware placé à la racine n'était pas découvert avec l'arborescence `src/app`                                                                                                                                                                                               | Déplacement vers `src/middleware.ts` ; headers et nonce ensuite présents                                                                                                                                                                                                       |
| Pré-audit GREEN 2                | Le serveur Next.js de développement injecte son overlay, du code d'évaluation et des styles incompatibles avec une CSP qui interdit absolument `unsafe-eval` et `unsafe-inline`                                                                                                   | Exécution Playwright déplacée vers un build de production, contexte de validation de la CSP stricte                                                                                                                                                                            |
| Pré-audit GREEN 3                | En production, `/prompts` est pré-rendue statiquement : le header CSP reçoit un nonce mais les balises `<script>` de la page statique n'en portent pas                                                                                                                            | Aucune quatrième tentative. Diagnostic : rendre le layout ou la route dynamique afin que Next.js puisse propager le nonce par requête                                                                                                                                          |
| Reprise après validation humaine | La pré-rendu statique empêchait toujours la propagation du nonce                                                                                                                                                                                                                  | Ajout ciblé de `dynamic = "force-dynamic"` sur `/prompts` par un nouvel agent ; E2E sécurité 1/1, suite Vitest 54/54, lint, types, build et audit npm verts ; audit indépendant lancé                                                                                          |
| Audit 1                          | Trois constats MAJEURS : rédaction trop étroite du logger (`sessionToken`, `access_token`, `passwordHash`, `premiumBody` et secrets intégrés à un message) ; `connect-src` ouvre globalement `ws:`/`wss:` ; variable système `VERCEL` absente de `.env.example`                   | Renvoyés à l'agent d'implémentation de reprise. Aucun test ni fichier pipeline à modifier                                                                                                                                                                                      |
| Correction audit 1               | —                                                                                                                                                                                                                                                                                 | Logger renforcé par normalisation des clés et assainissement des chaînes ; CSP réduite à `connect-src 'self'` ; `VERCEL` documentée comme injection plateforme à ne pas définir localement. E2E sécurité, 54/54 Vitest, lint, types, build et audit npm verts ; ré-audit lancé |
| Audit 2                          | CSP et documentation `VERCEL` conformes. Un MAJEUR subsiste : `client_secret=`, `AUTH_SECRET=` et `secret=` fuient dans les messages. Un MINEUR : sur-rédaction de métadonnées bénignes (`sessionDurationMs`, `tokenCount`, `passwordPolicyVersion`, `secretaryName`, `somebody`) | Renvoyés au même agent d'implémentation pour une détection par tokens/noms conventionnels plutôt que par sous-chaînes trop larges                                                                                                                                              |
| Correction audit 2               | —                                                                                                                                                                                                                                                                                 | Logger resserré avec noms exacts et motifs ancrés ; secrets génériques dans les messages désormais assainis, métadonnées bénignes conservées. Contre-tests directs, 54/54 Vitest, E2E sécurité, lint, types, build et audit npm verts ; troisième audit lancé                  |
| Audit 3                          | Audit technique CONFORME, aucun BLOQUANT ni MAJEUR. Les secrets en clés et en chaînes sont rédigés, les métadonnées bénignes préservées, la CSP et `VERCEL` conformes. Seul MINEUR : `next-env.d.ts` est réécrit par `next build`                                                 | Dérive générée restaurée après les validations, sans changement fonctionnel ; audit clos                                                                                                                                                                                       |

## Décisions d'implémentation

- Le résolveur d'identité réseau ne lit `X-Forwarded-For` que lorsque l'exécution Vercel est explicitement attestée. La plateforme garantit alors l'écrasement de cet en-tête : <https://vercel.com/docs/headers/request-headers>.
- En local et en CI, toutes les requêtes partagent un compartiment sentinelle fixe. Ce repli est volontairement restrictif : il permet la démonstration locale et empêche un client de contourner la limite en forgeant des IP. Il ne prétend pas fournir une granularité par IP hors Vercel.
- Un proxy placé devant Vercel et toute configuration de proxy vérifié restent hors périmètre de la tranche 03.
- Le compteur est stocké en PostgreSQL dans `RateLimit`, avec mise à jour atomique, fenêtre d'une minute et purge explicite des lignes expirées. Les routes générales acceptent 60 appels ; `/api/auth/*` et les routes d'inscription en acceptent 10.
- La CSP est générée par requête dans `src/middleware.ts`, sans `unsafe-inline`, `unsafe-eval`, `ws:` ni `wss:`. `/prompts` est rendue dynamiquement afin que Next.js propage le nonce aux scripts du document.
- Playwright valide la CSP sur un build de production : le mode développement Next.js injecte un overlay incompatible avec la politique stricte demandée.
- Les erreurs domaine sont mappées vers HTTP à la frontière, avec réponse générique et UUID corrélé à un log JSON `stdout`. Le logger rédige les clés sensibles et les secrets inclus dans des chaînes sans supprimer les métadonnées opérationnelles bénignes.
- `VERCEL` reste optionnelle, validée côté serveur et documentée comme variable système injectée par la plateforme, à ne pas définir localement.

## Écarts

### Blocage E2E — nonce CSP et pré-rendu statique

Constat factuel : après trois tentatives distinctes, le scénario Playwright de la tranche reste rouge. Le troisième essai, en build de production, prouve que les headers de sécurité et le nonce CSP sont présents, mais que les balises `<script>` de `/prompts`, pré-rendue statiquement, ne reçoivent pas ce nonce.

Diagnostic proposé par l'agent d'implémentation : forcer le chemin de rendu à être dynamique, idéalement en lisant `headers()` dans `src/app/layout.tsx` pour rattacher le rendu au nonce de la requête, ou au minimum via une configuration dynamique explicite. Cette modification est dans le périmètre du socle CSP, mais son efficacité exige une quatrième exécution E2E.

Tentatives effectuées : (1) middleware racine non découvert avec `src/app` ; (2) middleware découvert, mais overlay de développement incompatible avec la CSP stricte ; (3) build de production, CSP correcte dans les headers mais scripts statiques dépourvus de nonce.

État des autres preuves : les sept fichiers Vitest ciblés sont verts, soit 25/25 tests ; le type-check et le build de production sont verts ; les huit empreintes des tests gelés sont inchangées. Aucun fichier `docs/pipeline-dev/` n'a été modifié.

Décision humaine requise : autoriser ou refuser une quatrième tentative ciblée consistant à rendre le layout ou `/prompts` dynamique pour permettre à Next.js d'injecter le nonce dans les scripts, puis relancer le scénario E2E. Le chef-projet ne valide pas lui-même cet écart.

Décision humaine du 2026-08-07 : le porteur a autorisé la tentative ciblée. L'écart est clos pour reprise. Conformément à la règle de continuité après validation d'un écart, la reprise est confiée à un nouvel agent d'implémentation, avec les tests gelés inchangés.

### Blocage de gouvernance — troisième modification locale de la pipeline

Constat factuel : `git diff origin/main -- docs/pipeline-dev/03-socle-securite.md` montre deux lignes ajoutées sous « À trancher » : `> J'accepte la recommandation` et `> Idem`. Les réponses produit sont désormais préservées dans le relevé de décisions ci-dessus, mais le fichier contractuel diffère toujours de `origin/main`.

Historique de l'obstacle : la tranche 02 a déjà subi deux réécritures locales de son fichier pipeline, restaurées après autorisation humaine. Son journal annonçait qu'une troisième occurrence déclencherait la règle d'arrêt. Cette troisième occurrence est maintenant constatée sur la tranche 03.

Conséquence : aucun agent RED, GREEN ou AUDIT ne peut être lancé tant que `docs/pipeline-dev/` n'est pas revenu à son état versionné. La tranche reste exécutable telle qu'écrite ; le blocage porte uniquement sur l'intégrité du contrat local.

Proposition soumise à validation humaine : restaurer uniquement `docs/pipeline-dev/03-socle-securite.md` depuis `origin/main`, sans toucher aux autres fichiers. Les deux décisions resteront dans ce journal et seront transmises aux trois agents.

Tranches impactées : la tranche 03 est bloquée ; par dépendance, les tranches 04 à 12 ne peuvent pas démarrer.

Tentatives effectuées : lecture du diff ciblé, conservation des deux réponses dans le journal, arrêt avant toute création d'agent ou écriture de test.

Décision humaine du 2026-08-07 : le porteur a autorisé la restauration ciblée. Seul `docs/pipeline-dev/03-socle-securite.md` a été restauré depuis `origin/main`. Les deux réponses demeurent dans le relevé de décisions ; `git diff --exit-code origin/main -- docs/pipeline-dev` est vert. Le blocage est clos.

## Validation finale

Audit indépendant final : **CONFORME**, sans constat BLOQUANT ni MAJEUR. L'auditeur a revérifié les huit empreintes gelées, l'intégrité de la pipeline, PostgreSQL 16, les migrations et le seed, l'atomicité sur 25 écritures concurrentes, la purge, les réponses HTTP brutes, la CSP réelle, la confiance Vercel conditionnelle et les contre-tests du logger. Le MINEUR généré par `next build` sur `next-env.d.ts` a été nettoyé après validation.

Recette relancée par le chef-projet le 2026-08-07 avec la valeur factice documentée dans `.env.example` :

- `npm run lint` : vert ;
- `npm run type-check` : vert ;
- `npm run test` : 16 fichiers, 54 tests verts ;
- `npm run build` : vert, `/prompts` confirmée dynamique ;
- `npm run e2e` : 4 parcours verts, dont le livrable sécurité avec 70 requêtes ;
- `npm audit --audit-level=high` : 0 vulnérabilité ;
- navigateur réel à `390 × 844` : `/prompts` présente un `<main>`, deux `<article>`, les deux prompts attendus, largeur document `390`, aucun débordement horizontal et aucune erreur console ;
- états `loading`, `error`, `empty` et `success` de `/prompts` couverts par les tests d'écran hérités ; écrans globaux `error` et `not-found` accessibles et adaptés au mobile ;
- huit empreintes gelées inchangées ; `git diff --check` et le garde-fou `docs/pipeline-dev/` verts ;
- DoD commune et DoD spécifique satisfaites ;
- PR [#4](https://github.com/Danii15321/Synapse/pull/4) : validations distantes initiales entièrement vertes sur le run [`push` 31221328919](https://github.com/Danii15321/Synapse/actions/runs/31221328919) et le run [`pull_request` 31221357906](https://github.com/Danii15321/Synapse/actions/runs/31221357906). Les deux exécutent garde pipeline, lint, types, migrations, seed, 54 tests, build, installation Chromium, 4 E2E et audit des dépendances.

## Rapport de sortie

```text
RAPPORT DE TRANCHE — 03 Socle de sécurité transverse

Statut          : TERMINÉE
Tests           : 18 écrits · 18 verts · 54 verts avec non-régression
Itérations      : 3 passages d'audit · 2 retours d'implémentation
DoD             : commune ✓ · spécifique ✓
Livrable        : /prompts démontré à 390 × 844 avec headers, nonce par requête, hydratation saine ; 70 requêtes produisent 429 + Retry-After ; erreur générique corrélée sans fuite
Écarts ouverts  : aucun
Décisions prises: X-Forwarded-For fiable uniquement sur Vercel attesté ; compartiment local fail-closed ; rendu /prompts dynamique ; reprise nonce autorisée par le porteur
Prochaine étape : tranche 04 — authentification complète, après validation du porteur
```
