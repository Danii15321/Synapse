# Journal — tranche 09 : Jeux & concours et inscriptions

- Démarrée le : 2026-08-09 / Terminée le : — / Statut : VALIDATION DISTANTE EN COURS

## Definition of Ready

Tranche précédente validée : oui — la tranche 08 est fusionnée dans `main`, sa
CI post-fusion est verte et son journal est clos.

Écarts des journaux précédents pris en compte : E04-01 reste applicable à la
stratégie de sessions PostgreSQL `database`. E06-01 demeure reporté au premier
déploiement HTTPS public ou à la tranche 12. Aucun autre écart ouvert n'empêche
la tranche 09.

Questions « À trancher » : résolues par le porteur le 2026-08-09. L'écart
produit entre la tranche brute, limitée aux jeux et concours, et la décision de
la tranche 08 d'inscrire aussi les formations événementielles a été présenté au
porteur puis explicitement validé avant le démarrage. Le fichier de pipeline
reste inchangé, l'arbre initial est propre et la branche
`feat/tranche-09-jeux-inscriptions` est créée. La Definition of Ready est
satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » ou précision produit | Réponse retenue                                                                                                                                                                                                                                                    | Tranchée par                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Désinscription possible                      | Oui. L'utilisateur peut annuler sa participation ; seule sa participation à l'activité est supprimée, avec filtrage sur le `userId` de session, et la place est libérée. Il ne s'agit ni de supprimer le compte ni de perdre le statut premium.                    | Porteur du projet le 2026-08-09                              |
| Champs demandés à l'inscription              | Le compte suffit en v1. Aucun téléphone, établissement ou texte de motivation n'est demandé, afin de minimiser la friction. L'organisateur dispose du nom et de l'e-mail du compte.                                                                                | Porteur du projet le 2026-08-09                              |
| Récupération de la liste des inscrits        | Requête SQL manuelle assumée en v1. Aucun écran d'administration ni export CSV n'est livré dans cette tranche.                                                                                                                                                     | Porteur du projet le 2026-08-09                              |
| Vocabulaire utilisateur                      | Employer « participation » : « Je participe », « Participation confirmée », « Annuler ma participation » et « Mes participations ». Le mot « inscription » reste acceptable dans le modèle technique et ne doit pas être confondu avec la création de compte.      | Porteur du projet le 2026-08-09, sur recommandation acceptée |
| Activités acceptant une participation        | Le même parcours couvre les jeux et concours ainsi que les formations `EVENEMENTIELLE`. Une formation `PERMANENTE` n'accepte jamais de participation. Les axes `FREE`/`PREMIUM` restent indépendants du type d'activité et l'entitlement est vérifié côté serveur. | Porteur du projet les 2026-08-08 et 2026-08-09               |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un
test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : à 390 px, un membre connecté ouvre un jeu, un concours
ou une formation événementielle, participe, voit une confirmation indiquant la
date, le lieu ou la modalité et l'absence d'e-mail, puis retrouve l'activité
dans « Mes participations ». Un second tap ne crée aucun doublon. Une activité
close ou complète refuse clairement la participation ; une activité premium
refuse un membre `FREE`. Le membre peut annuler sa propre participation et
libérer la place, sans pouvoir voir ni manipuler celle d'un autre.

Périmètre : rubrique Jeux & concours au niveau du patron de la tranche 07 ;
modèle de participation persisté et garantie d'unicité en base ; extension
strictement nécessaire des formations événementielles au même chemin
d'écriture ; validation Zod stricte ; repositories à sélections explicites ;
services d'entitlement, publication, fermeture, capacité transactionnelle,
idempotence et annulation ; Route Handlers protégés contre appel direct, CSRF
et abus ; accès HTTP client partagé, mutation et états d'interface ; liste
« Mes participations » filtrée par la session ; confirmation hors plateforme ;
tests repository, service, API, interface et E2E.

Hors périmètre : participation aux formations permanentes ; paiement réel ;
e-mail de confirmation ; liste d'attente ; écran d'administration ; export
CSV ; téléphone, établissement ou motivation ; déroulement, classement,
résultats ou suivi de jeu sur la plateforme ; upload et notifications.

DoD commune applicable : démonstration navigateur 390 px ; quatre états sur
chaque écran touché ; non-régression 01–08 ; lint, typage, tests et build verts ;
architecture en couches ; Zod strict ; vraie base pour les repositories ;
JSON/HTML/RSC sans contenu premium pour anonyme/FREE ; isolation cross-user ;
audit des dépendances ; reproductibilité et documentation.

DoD spécifique : double soumission idempotente ; concurrence sur la dernière
place ; refus après clôture ; refus `FREE` sur activité `PREMIUM` ; isolation ;
appel direct sans session refusé ; régime de rate limiting sensible ; parcours
complet compte → confirmation → mes participations ; annulation filtrée par la
session ; formations événementielles incluses et permanentes exclues.

Pièges retenus comme cas de test : vérifier puis insérer au lieu de laisser la
contrainte unique arbitrer ; compter hors transaction ; laisser le bouton actif
pendant la mutation ; prendre `userId` du body ; transformer `P2002` en 500 ;
confirmation sans date ni lieu/modalité ; supprimer la participation d'un
tiers ; rendre participable une formation permanente ; confondre création de
compte, premium et participation ; fuiter le corps premium dans le JSON, le
HTML ou le RSC.

## Tests

Phase RED terminée, relue et relancée par le chef-projet le 2026-08-09. Les
tests sont désormais **gelés** : l'agent d'implémentation ne peut modifier
aucun des fichiers ci-dessous.

Couverture figée — 55 cas Vitest et 6 parcours Playwright, soit 61 cas :

- PostgreSQL réel : modèles, relations, index, unicité, filtrage des champs
  verrouillés par `select`, brouillons, pagination sur 205 lignes, double
  soumission, concurrence sur la dernière place, participation persistante aux
  formations événementielles, isolation et annulation ;
- services : session obligatoire, entitlement des jeux et formations,
  publication, clôture, capacité, idempotence, refus des formations
  permanentes, pagination, liste et annulation filtrées par l'identité de
  session ;
- Route Handlers : listes et détails, JSON premium brut anonyme/FREE, Zod
  strict, absence de `userId` client, CSRF, erreurs génériques corrélées par
  UUID, statuts 400/401/403/409, deuxième soumission en 200, annulation des
  jeux/formations et « Mes participations » ;
- interface : états loading/error/empty/success/not-found, cartes 4/3 avec
  visuel de repli, vocabulaire « participation », visiteur non connecté,
  premium/clos/complet/déjà inscrit/en cours/inscrit, bouton désactivé pendant
  la mutation, confirmation date + lieu/modalité + absence d'e-mail, compte
  vide ou rempli ;
- E2E à 390 px : fallback réellement mesuré en 4/3 et connexion avec
  `callbackUrl` sans POST ; parcours complet participation, idempotence,
  compte et annulation ; refus clos/complet/premium ; formation événementielle
  contre permanente ; absence de fuite via JSON/HTML/RSC ; quota sensible de
  dix requêtes.

Revue avant gel : le chef-projet a refusé la première version, qui ne prouvait
pas assez l'état anonyme, la pagination, le ratio réel, l'index de publication
et la forme des erreurs API, et utilisait de faux objets d'erreur fondés sur
leur seul nom. Le même agent de tests a renforcé ces six preuves sans modifier
le comportement attendu.

Preuve RED indépendante : les 14 fichiers Vitest applicatifs sont rouges ; les
trois tests de modèle PostgreSQL et les deux tests de compte collectables
échouent effectivement, les douze autres suites échouent à la résolution des
modules encore absents. Playwright est rouge avant démarrage du serveur car le
type-check de la tranche absente échoue. Aucun test nouveau n'est vert. Les
fichiers de pipeline et `next-env.d.ts` ont un diff vide.

Empreintes SHA-256 gelées :

| Fichier                                                      | SHA-256                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `tests/api/inscription-account-routes.test.ts`               | `e09f7260e86e35a05e36419fd3f124bcffc3b3d81f98c58b7643b928190a55b4` |
| `tests/api/inscription-route-fixtures.ts`                    | `62834110a0a0113e3b6cc0545ad2a40c108c6af4fd6ad75917a6afcbffd88d3a` |
| `tests/api/inscription-routes.test.ts`                       | `e5320522994b67eb6b06c110917786e9dacccd15e63c4300152f90f2ee1bde41` |
| `tests/api/jeux-routes.test.ts`                              | `5fe2ba1fc424f92c861c524e4567572fbc02da3916e5ab63c4cd9f8e797370d7` |
| `tests/components/account-participations.test.tsx`           | `c6d141d7271144f999da035e60848bd5e885dca8ae96283ef2c691f25e30be13` |
| `tests/components/jeux-participations-states.test.tsx`       | `e372926bd96cf6fb50a5acfce83a8e71170f02e45af863e96ff64bafc10bf0ab` |
| `tests/components/jeux-participations-ui.test.tsx`           | `85f73f576fe9adaa96cda500f7e4d40e86ff77670e167ac3a2fc6d71290a8c11` |
| `tests/components/participation-control.test.tsx`            | `eeaf681df600221430b309e09ecd83789882b4cc1f7050cfad123cdde920082b` |
| `tests/components/query-client-test-utils.tsx`               | `82d50b18a4f401d6d98d65661aa1a458f8c92d8e80e51da364183e868af59b44` |
| `tests/e2e/home-premium-safety.spec.ts` (harnais historique) | `06f83edf7c11917f8fb0c6c3460188f08561591b698e4fd624bc2fc414159919` |
| `tests/e2e/jeux-participations-helpers.ts`                   | `1554a7b2f9af979baa9e83d0b9c6e00d83ec403eb3ffefbd868d1eed7a39c61f` |
| `tests/e2e/jeux-participations.spec.ts`                      | `27f4cf307ccb9ec8d728c8ec264369f78a95cc57af9064676c4c1dda18b4e8e0` |
| `tests/repositories/inscription-repository.test.ts`          | `d9853421e572e27c5926957eddfd7476c0787551ad025d677cac62b72c906f30` |
| `tests/repositories/jeu-repository.test.ts`                  | `e28047615d9851bc5ec344729d624288db939fcc6f39d5d99522cd0cc5b64216` |
| `tests/repositories/jeux-inscriptions-fixtures.ts`           | `e66e2fbe7c58fc9a484e61f07a1f6b75fb3b100415dfb28636ac0e3db2363ad2` |
| `tests/repositories/jeux-inscriptions-model.test.ts`         | `e676865df8196f162de21539c6fa94cbc409bfc1c948e8efdd7990a87f7f2831` |
| `tests/repositories/jeux-inscriptions-pagination.test.ts`    | `2a00cf92de01e313969240a24891afb05b6d81c50008d5b1c919eb9043cdd5f0` |
| `tests/services/inscription-service-fixtures.ts`             | `9f17609ed21593a0fadb2e326de6c080a05dd191c8b7df143dc82d246f6eb43c` |
| `tests/services/inscription-service-formations.test.ts`      | `9e6c73ca9b1b29880467ef7209a74b098f9d814eb3eb89ffaf1d2d0a1da9af90` |
| `tests/services/inscription-service-rules.test.ts`           | `e23e1d6467d680bd8ee3fc4480d7bc358c284c856ab33eec8c5fe0d96cf7b397` |
| `tests/services/jeu-service.test.ts`                         | `4b6e2e8182e5803153bc306ba88a41ae209383cd03cb510a5c7699b76a27cade` |

## Itérations audit ↔ implémentation

| #                        | Constats renvoyés                                                                                                                                                                                                                                                                                                                                  | Ce qui a été corrigé                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pré-GREEN                | Sous Vitest 3.2.7, `inscription-service-fixtures.ts` exposait la clé `scenario` avec une valeur `undefined` ; les deux suites de service échouaient avant collecte, indépendamment du code.                                                                                                                                                        | Après arrêt conforme de l'agent d'implémentation et reproduction par le chef-projet, le même agent de tests a remplacé la réexportation défectueuse par un wrapper réellement callable, sans changer aucun scénario ni aucune assertion. Les deux suites collectent et passent 11/11 sur l'implémentation partielle ; nouvelle empreinte gelée ci-dessus. |
| Pré-GREEN 2              | Cinq locators E2E confondaient l'information attendue avec des doublons légitimes : URL optimisée Next/Image, lieu visible dans le détail et la confirmation, mot « complet » dans six éléments, modalité dans un badge et la confirmation, balise RSC `body` prise pour le champ premium. Une sixième ambiguïté de libellé premium était masquée. | Après reproduction 1/6 par le chef-projet, le même agent de tests a ciblé la ressource source du fallback, les lignes précises de confirmation et de refus, et une propriété `body` plutôt que le tag racine. Aucun comportement métier n'a changé ; les 6/6 E2E passent et la nouvelle empreinte est gelée ci-dessus.                                    |
| Audit 1 — harnais        | L'audit exigeait TanStack Query v5 et des hooks métier, mais trois suites rendaient les composants directement hors `QueryClientProvider`; une implémentation conforme aurait échoué avec `No QueryClient set` avant de juger le comportement.                                                                                                     | Après arrêt conforme de l'implémenteur, l'agent de tests a ajouté un `QueryClient` neuf par rendu, sans retry ni cache partagé. Les 34 assertions, scénarios et mocks métier ont des empreintes AST identiques ; seul le harnais change. Quatre nouvelles empreintes sont gelées ci-dessus.                                                               |
| Audit 1                  | Verdict non conforme : annulation du compte sans attente ni erreur accessible ; traduction `format` en français et DTO public construits dans le repository ; TanStack Query et hooks métier absents des mutations clientes.                                                                                                                       | L'implémenteur a ajouté React Query v5, un provider racine et des hooks avec cache isolé par `userId`; les composants exposent `status` et `alert`; le repository retourne l'enum Prisma brut et le service construit/valide le DTO public. Tranche 55/55, suite 278/278, E2E 29/29, lint, typage, build et audit npm verts avant contre-audit.           |
| Audit 2                  | Le contre-audit a prouvé qu'un cache « Mes participations » déjà créé avec `staleTime: Infinity` pouvait prévaloir sur les données serveur après une création ou annulation depuis un détail. L'absence de scénario gelé a été remontée ; les tests sont restés immuables.                                                                         | `useParticipationControl` retire désormais toutes les queries sous le préfixe participation après mutation réussie ; le retour au compte repart de données fraîches, avec isolation par `userId` conservée. État stable commit `534fa6c`; tranche 55/55, suite 278/278, E2E 29/29 et chaîne qualité verte avant nouvel audit.                             |
| Recette finale — harnais | La recette indépendante a reproduit 27/29 E2E : deux créations de compte héritaient du compteur PostgreSQL `auth-callback` rempli par les fichiers précédents. Les pages affichaient l'erreur générique attendue du quota ; aucun comportement applicatif de la tranche n'était en cause.                                                          | Le seul agent de tests a ajouté un nettoyage ciblé de ce compteur juste avant les deux helpers concernés, sans modifier scénario, assertion, locator ni test du quota. Commit `afb04e6`; nouvelles empreintes ci-dessus. L'auditeur a confirmé le caractère strictement harnais et Playwright passe désormais 29/29 sans préparation externe.             |
| Audit 3                  | Contre-audit du HEAD stable `afb04e6`, incluant l'intégrité du correctif de harnais, les empreintes, l'architecture, la sécurité premium, l'isolation, la concurrence et le quota sensible.                                                                                                                                                        | Verdict **CONFORME** : aucun constat bloquant, majeur ou mineur. Lint et typage verts, 278/278 Vitest et 29/29 Playwright ; code applicatif et pipeline inchangés par le dernier commit.                                                                                                                                                                  |

## Décisions d'implémentation

- Deux tables relationnelles séparées, `Inscription` pour les jeux et
  `FormationInscription` pour les formations événementielles, conservent des
  clés étrangères et contraintes d'unicité réelles plutôt qu'une cible
  polymorphe nullable difficile à garantir en base.
- La capacité est arbitrée dans une transaction avec verrou de ligne sur
  l'activité. La contrainte unique tranche les doubles soumissions concurrentes
  et l'erreur Prisma `P2002` est convertie en succès idempotent, jamais en 500.
- La suppression filtre simultanément l'activité et le `userId` issu de la
  session. Elle libère immédiatement la place sans exposer ni accepter un
  identifiant d'utilisateur côté client.
- Le contrôle premium reste dans les services et `access/`. Les repositories
  utilisent des `select` explicites : le corps d'un jeu premium n'est pas chargé
  pour un anonyme ou un membre `FREE`, y compris dans les réponses JSON, HTML et
  RSC.
- TanStack Query v5 pilote les mutations clientes via des hooks métier. Le cache
  « Mes participations » est isolé par `userId` et supprimé après une création ou
  une annulation depuis un détail afin que le prochain affichage reparte des
  données serveur.
- La confirmation affiche les informations immédiatement utiles — date,
  lieu ou modalité — et précise qu'aucun e-mail n'est envoyé en v1. L'interface
  utilise partout le vocabulaire produit « participation ».

## Écarts

### Écart validé E09-01 — participation aux formations événementielles

Constat factuel : la tranche 09 brute définit uniquement `Jeu` et une
`Inscription` reliée par `jeuId`, alors que la décision produit prise en tranche
08 réserve explicitement une inscription aux formations événementielles et la
reporte au chemin d'écriture de la tranche 09. Sans extension, cette décision
validée resterait sans tranche d'implémentation dans la pipeline v1.

Proposition soumise avant démarrage : généraliser le comportement de
participation de la tranche courante aux jeux, concours et formations
`EVENEMENTIELLE`, sans ouvrir la participation aux formations `PERMANENTE` et
sans ajouter de mécanisme d'administration.

Tranches impactées : tranche 09, pour le modèle et le parcours ; tranche 11,
pour le contrat et le peuplement des activités réelles ; tranche 12, pour la
recette v1.

Décision humaine du 2026-08-09 : le porteur a accepté cette proposition avec
« ça marche, applique tes recommandations et implémente la tranche 09 ».
L'écart est validé et clos avant la phase RED ; la pipeline reste inchangée.

## Validation finale

État local stable audité : `afb04e6`.

- migration : 10 migrations trouvées, schéma PostgreSQL à jour ;
- seed : exécuté avec succès ;
- lint : réussi sans avertissement ;
- TypeScript strict : réussi ;
- Vitest complet : 78 fichiers, **278/278** tests réussis ;
- build Next.js de production : réussi, 24 pages générées ;
- Playwright Chromium complet : **29/29** parcours réussis, dont les six
  parcours de tranche à 390 px ;
- audit npm : 0 vulnérabilité ;
- empreintes : 21/21 conformes après correction documentée du harnais ;
- `git diff --check` : propre ; aucun fichier `docs/pipeline-dev/` modifié ;
- contre-audit final : **CONFORME**, sans constat ouvert.

La validation distante, les URLs des deux PR et les exécutions CI seront
ajoutées sur la branche documentaire de clôture après fusion de la PR
d'implémentation.

### Validation GitHub — implémentation

- PR d'implémentation : [#14 — ajouter les participations aux activités](https://github.com/Danii15321/Synapse/pull/14), fusionnée le 2026-08-09 ;
- commit de fusion : `adfe64402c190002913fe480d2fac9f0be0d0181` ;
- CI du push : exécution `31332969384`, verte en 3 min 24 s ;
- CI de la pull request : exécution `31332972353`, verte en 3 min 43 s.

La PR documentaire de clôture est créée à l'étape suivante ; son URL et ses
preuves CI seront consignées dans un second commit avant fusion.
