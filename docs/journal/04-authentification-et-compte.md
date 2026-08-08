# Journal — tranche 04 : Authentification et compte

- Démarrée le : 2026-08-08 / Terminée le : — / Statut : EN COURS

## Definition of Ready

Tranche précédente validée : oui — la tranche 03 est terminée, auditée, fusionnée sur `main` par la PR #4 et sa CI post-fusion est verte.

Écarts des journaux précédents pris en compte : les écarts des tranches 01 à 03 sont tous clos. Aucun n'impose de travail ou de décision supplémentaire à la tranche 04. La confiance dans `X-Forwarded-For` reste limitée à une exécution Vercel attestée ; le rate limiting sensible à 10 requêtes/minute fourni par la tranche 03 est disponible pour les routes d'authentification.

Questions « À trancher » : toutes résolues par l'instruction du porteur d'appliquer les deux recommandations. La pipeline est identique à `origin/main`, le worktree de départ est propre et le journal est créé. La Definition of Ready est satisfaite.

### Relevé de décisions — à transmettre aux trois agents

| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|
| Vérification d'adresse e-mail à l'inscription | Pas de vérification en v1 ; le champ `emailVerified` est présent mais inutilisé. Activation reportée en v2 avec la réinitialisation de mot de passe | Porteur du projet, instruction « applique les deux recommandations » du 2026-08-08 |
| Durée de session | 30 jours glissants | Porteur du projet, instruction « applique les deux recommandations » du 2026-08-08 |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : un visiteur s'inscrit, devient connecté, consulte `/compte` avec son e-mail et le statut `FREE`, se déconnecte puis se reconnecte ; un anonyme qui ouvre `/compte` est redirigé vers `/login`. Depuis le compte, l'utilisateur peut changer son mot de passe en fournissant l'ancien, ce qui invalide ses autres sessions.

Périmètre : modèles Auth.js Prisma (`User`, `Account`, `Session`, `VerificationToken`) et enum `Membership` ; stratégie de session `database` de 30 jours glissants ; provider Credentials avec argon2id ; cookie `httpOnly`, `Secure`, `SameSite=Lax` ; callback de session avec `id` et `membership` ; inscription Zod stricte et mot de passe de 12 caractères minimum ; connexion/déconnexion ; `requireUser()` ; garde UX du groupe membre et défense en profondeur ; pages login/register/compte ; changement de mot de passe et rotation/invalidation des sessions ; navigation connectée/déconnectée ; rate limiting sensible hérité.

Hors périmètre : vérification d'e-mail en v1 ; envoi d'e-mail et réinitialisation par e-mail ; fournisseurs OAuth ; administration ; entitlement et contenu premium de la tranche 05 ; paiement.

DoD commune applicable : parcours complet démontré à 390 px ; états `loading`, `error`, `empty`, `success` sur les écrans touchés ; non-régression des parcours accueil, prompts et sécurité ; lint, types, tests et build verts ; couches strictes ; vraie PostgreSQL ; Zod strict ; aucune fuite de mot de passe/cookie/token ; reproductibilité et commits conventionnels.

DoD spécifique : attributs du cookie ; `requireUser()` refuse session absente, expirée ou falsifiée ; aucune énumération ; mot de passe absent des réponses et logs ; handler protégé sans dépendre du middleware ; changement de mot de passe avec ancien secret et invalidation des autres sessions ; aucun import `next-auth` hors de `src/server/auth/`.

Pièges retenus comme cas de test : middleware insuffisant seul ; session interdite dans services et repositories ; stratégie JWT interdite ; message et temps de réponse non discriminants ; argon2id obligatoire ; `requireUser()` dans toute Server Action protégée.

## Tests

Phase RED terminée le 2026-08-08 par l'agent de test isolé, avant toute écriture de code applicatif.

- 43 nouveaux tests : 39 Vitest et 4 Playwright à 390 px.
- Preuve Vitest initiale : 35 nouveaux tests rouges et les 54 tests antérieurs verts ; après la reprise de couverture, 4 tests Vitest supplémentaires sont rouges pour les artefacts attendus absents.
- Preuve Playwright : les 3 premiers parcours sont rouges dès l'absence de `/register` ; le parcours de navigation ajouté en reprise est rouge sur l'état d'authentification absent.
- `npm run type-check` et ESLint ciblé sur les tests : verts.
- PostgreSQL 16 réel utilisé pour les tests repository.
- Aucun code applicatif, fichier de pipeline ou journal n'a été écrit par l'agent de test.

Couverture : modèles Prisma Adapter, repository à sélection explicite, argon2id, inscription et Credentials sans énumération, `requireUser()`, route protégée appelée directement, Server Action protégée, CSRF, changement de mot de passe et rotation/invalidation des sessions, configuration du secret, frontières Auth.js, formulaires accessibles, navigation connectée/déconnectée et parcours mobile complet.

Empreintes SHA-256 avant gel :

| Fichier | SHA-256 |
|---|---|
| `tests/api/account-route.test.ts` | `c6147f435a4e043fd89e5ea41303acf2ee64858dbdbc02a271a766b98831a233` |
| `tests/api/auth-routes.test.ts` | `588553e52f27fb07709bba55039af9862e87db47c9ade2558b0153848b77578e` |
| `tests/api/change-password-action.test.ts` | `09878eb5a5ed5084078becd0874ed1fb1abc379bcb918fe4437b16b5c2a1637e` |
| `tests/components/auth-forms.test.tsx` | `538ac01f838de134de61b8d52ff776004bf2b6864ed97a6a2dddc0f362caa89f` |
| `tests/contracts/auth-architecture.test.ts` | `17875ac2295b805730980dd300384ca7b19c4f76c04ae29f05f7d604510b7c35` |
| `tests/contracts/auth-ui-contract.test.ts` | `b231a506ba04986c0b0d7b21b307870636f9a3f9bd9e8690a8dc00468633f436` |
| `tests/e2e/auth-navigation.spec.ts` | `1a67b530547570f1a16336ea0911b2be8b733ccd81d54418051bd2be8b40a2a1` |
| `tests/e2e/auth.spec.ts` | `3a4ab5975b5e202dfab951ea732307737f26fc21a6840561ccaff1cb995e84d7` |
| `tests/repositories/auth-repository.test.ts` | `9210d4ade82fefc54bdfa45d575e2e97d0cdcf1e207611286e72eb0390361314` |
| `tests/server/auth-secret-config.test.ts` | `54fe3629c3fc5b49c59314f8d73ea97ef3d5e5c54feb105148f636f5a812a0a7` |
| `tests/services/auth-service.test.ts` | `357fd57fac245edd6f62a3b46ab056f1a9bbb59fd92ada04184de8aab4914265` |
| `tests/services/password-service.test.ts` | `9c924bdd1e1e535c18d52b4bcd81330d5a42376af47e87ce0fa9d07a50d4819b` |
| `tests/services/require-user.test.ts` | `3b19605d04fb18aa8fadb95654feebee5354d1eaa94cb2036570356169d8b024` |

Gel déclaré le 2026-08-08 après arbitrage humain de l'écart E04-01. Les treize empreintes ci-dessus font foi : aucun agent d'implémentation ne peut modifier ces fichiers.

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| GREEN-1 | Premier E2E : `UnsupportedStrategy` Auth.js malgré la passerelle | Provider Credentials natif retiré de la configuration Auth.js ; la passerelle validée E04-01 reste seule responsable du callback Credentials, sessions `database` conservées |
| GREEN-2 | Deuxième E2E : les quatre parcours restent sur `/register` ; quota sensible partagé et état pending trop bref suspectés | Clé du rate limiting rendue spécifique à la route ; état pending rendu explicitement observable ; tests Vitest, lint, types et build restent verts |
| GREEN-3 | Troisième E2E : même obstacle, quatre parcours rouges ; appels directs via `localhost` verts mais Playwright via `127.0.0.1` reçoit l'erreur générique | **Arrêt obligatoire** après trois tentatives. Aucun quatrième essai. Hypothèse à arbitrer : la vérification CSRF compare l'origine `127.0.0.1` à une URL normalisée en `localhost` et refuse le navigateur avant l'authentification |
| AUDIT-1 | 2 MAJEURS : garde UX `/compte` absente du middleware ; erreurs de `/api/auth/logout` non mappées. 1 MINEUR : sentinelle `x-synapse-rate-limit-checked` forgeable lors d'un appel direct | Garde grossière ajoutée au middleware sans remplacer `requireUser()` ; erreurs logout mappées en réponses génériques corrélées ; sentinelle remplacée par une preuve HMAC liée à la méthode, au chemin et au nonce |
| AUDIT-2 | Aucun constat : 0 BLOQUANT, 0 MAJEUR, 0 MINEUR | Audit indépendant déclaré **CONFORME** après preuve HTTP réelle, vérification de la preuve HMAC, rejeu des suites et contrôle des empreintes gelées |

Reprise GREEN autorisée par le porteur du projet le 2026-08-08 par « Ok je l'autorise », limitée au diagnostic de la comparaison d'origine `127.0.0.1` / `localhost`, à son correctif si confirmé et aux validations qui en découlent. Cette autorisation ouvre un nouvel audit de blocage ; elle ne modifie ni le périmètre ni la dérogation E04-01.

Résultat GREEN avant audit : 93/93 tests Vitest, 8/8 tests Playwright à 390 px, lint, type-check, build et `npm audit` verts ; les treize empreintes gelées sont inchangées. L'audit indépendant a relancé ces preuves avec le même résultat, puis a ouvert les trois constats AUDIT-1 ci-dessus. L'avertissement Next.js sur la convention `middleware` reste informatif et hors périmètre de cette tranche.

## Décisions d'implémentation

### Passerelle Credentials avec sessions PostgreSQL

Le porteur du projet a validé le 2026-08-08 la recommandation proposée pour E04-01 par l'instruction « vas y » :

- conserver Auth.js, le Prisma Adapter, les cookies Auth.js et la stratégie de session `database` de 30 jours glissants ;
- ne jamais basculer vers JWT ;
- remplacer uniquement le callback Credentials natif incompatible par une passerelle interne dédiée sous `/api/auth/callback/credentials` ;
- cette passerelle appelle la vérification Credentials située dans `src/server/auth/`, crée une session Auth.js en PostgreSQL et pose le cookie de session avec les attributs prescrits ;
- elle applique les mêmes protections qu'un endpoint public sensible : Zod strict, vérification d'origine, limitation à 10 requêtes/minute, réponse uniforme et absence de fuite ;
- les autres routes et lectures de session restent gérées par Auth.js ; la dérogation ne crée ni JWT, ni nouvelle infrastructure, ni logique d'accès premium.

Cette décision est une dérogation locale au flux Credentials natif, pas une modification de la pipeline.

## Écarts

### Écart ouvert E04-01 — Credentials Auth.js incompatible avec les sessions `database`

- Constat : la tranche et `AGENTS.md` exigent simultanément le provider Credentials d'Auth.js et `session.strategy = "database"`, jamais JWT.
- Preuve sur la version disponible actuelle : `next-auth@5.0.0-beta.32` dépend de `@auth/core@0.41.3`, dont l'assertion de configuration lève `UnsupportedStrategy` avec le message « Signing in with credentials only supported if JWT strategy is enabled » lorsque Credentials est combiné à une session non-JWT. Le dépôt officiel confirme que ce comportement est intentionnel : <https://github.com/nextauthjs/next-auth/issues/3729>.
- Conséquence : l'implémentation littérale demandée ne peut pas produire le parcours de connexion et les sessions PostgreSQL exigés. Basculer vers JWT violerait la règle premium ; créer manuellement les sessions ou intercepter le callback Credentials ajouterait une frontière d'authentification non prévue et contournerait le flux Auth.js ; changer de bibliothèque sortirait de la stack prescrite.
- Décision requise : validation humaine d'une dérogation architecturale explicite avant la phase GREEN.
- Validation humaine : accord du porteur du projet le 2026-08-08 par « vas y » sur la recommandation de passerelle Credentials interne conservant les sessions PostgreSQL.
- Statut : **CLOS — dérogation locale validée**, sans impact sur une tranche ultérieure tant que la stratégie `database` et le contrat `SessionUser` sont conservés.

## Validation finale

Validation locale indépendante terminée le 2026-08-08 :

- audit final : **CONFORME**, 0 BLOQUANT, 0 MAJEUR, 0 MINEUR ;
- `npm run lint` : vert, zéro avertissement ;
- `npm run type-check` : vert ;
- `npm run test` : 27 fichiers et 93 tests Vitest verts ;
- `npm run build` : vert ; l'avertissement de dépréciation de la convention `middleware` est informatif et hors périmètre ;
- `npm run e2e` : 8 parcours Playwright verts à 390 px ;
- `npm audit --audit-level=high` : 0 vulnérabilité ;
- les treize empreintes SHA-256 gelées sont inchangées ;
- `docs/pipeline-dev/` est identique à `origin/main` et `git diff --check` est propre ;
- recette manuelle à 390 × 844 px : inscription, compte `FREE`, déconnexion, redirection de l'anonyme vers `/login`, reconnexion et message d'échec générique vérifiés ; accueil et `/prompts` sans débordement horizontal ni erreur console ; le changement de mot de passe n'a pas été soumis manuellement, son parcours complet étant couvert par Playwright.

Validation distante et fusion : en attente de la PR.
