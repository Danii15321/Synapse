# Journal — tranche 10 : Tunnel premium (mockup)

- Démarrée le : 2026-08-09 / Terminée le : — / Statut : VALIDÉE LOCALEMENT

## Definition of Ready

Tranche précédente validée : oui — la tranche 09 et sa clôture documentaire
sont fusionnées dans `main`, avec CI post-fusion verte.

Écarts des journaux précédents pris en compte : E04-01 conserve les sessions
PostgreSQL `database` ; E06-01 reste reporté au premier déploiement HTTPS public
ou à la tranche 12 ; E09-01 est clos. Aucun écart antérieur ne bloque la
tranche 10.

Les trois questions « À trancher » et les deux précisions nécessaires ont été
arbitrées par le porteur le 2026-08-09 : prix de 7 550 FCFA, offre visible sans
connexion, sortie vers WhatsApp sans donnée personnelle dans l'URL et dashboard
administrateur reporté après la v1. La Definition of Ready est satisfaite.

### Relevé de décisions — à transmettre aux trois agents après arbitrage

| Question « À trancher » ou précision produit   | Réponse retenue                                                                                                                                                                                                                                                                              | Tranchée par                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Prix et affichage                              | Paiement unique de **7 550 FCFA**, donnant un accès à vie sans abonnement. Le prix doit provenir d'une source unique, pas être répété dans les composants.                                                                                                                                   | Porteur du projet le 2026-08-09                                                             |
| Visibilité de l'offre                          | L'offre premium est publique et lisible par un visiteur non connecté. La création ou la connexion au compte reste nécessaire avant la demande de paiement, afin d'identifier le compte qui pourra être promu.                                                                                | Porteur du projet le 2026-08-09                                                             |
| Sortie du tunnel                               | Le porteur retient un contact WhatsApp vers le numéro administrateur `+33 6 68 82 30 12`, avec choix Wave ou mobile money. Aucun paiement n'est exécuté dans l'application et l'écran final ne doit jamais affirmer le contraire.                                                            | Porteur du projet le 2026-08-09                                                             |
| Données du formulaire et transmission WhatsApp | Nom complet, e-mail du compte en lecture seule, numéro WhatsApp et moyen choisi ; validation stricte, copie du récapitulatif dans le presse-papiers, puis ouverture de la conversation administrateur sans donnée personnelle dans l'URL. L'utilisateur colle et envoie lui-même le message. | Porteur du projet le 2026-08-09, recommandation validée                                     |
| Attribution après paiement manuel              | Conserver en v1 la commande d'administration existante, désormais branchée sur `membershipService.grantPremium(userId, source)`. Le dashboard administrateur est reporté après la v1, comme l'exigent les tranches 10 et 12.                                                                 | Porteur du projet le 2026-08-09, recommandation validée                                     |
| Frontière HTTP du tunnel                       | Aucun Route Handler métier ni Server Action : le tunnel n'écrit rien et prépare localement le transfert WhatsApp. La DoD commune d'intégration nominale est non applicable ; un test de contrat exhaustif prouve à la place qu'aucune voie publique n'atteint `grantPremium`.                | Arbitrage technique du chef-projet le 2026-08-09, conforme à la règle absolue de la tranche |
| Forme minimale de la trace d'attribution       | Modèle `MembershipGrant` relié à `User`, portant `userId`, `source` et `createdAt`. Promotion et trace sont atomiques ; un compte déjà `PREMIUM` ne crée pas une nouvelle attribution.                                                                                                       | Arbitrage technique du chef-projet le 2026-08-09, à la demande de l'agent de tests          |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un
test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable envisagé : à 390 px, un visiteur anonyme comprend l'offre
à vie à 7 550 FCFA puis est invité à créer son compte. Un membre `FREE` parcourt
le récapitulatif, renseigne les seules informations nécessaires, choisit Wave ou
mobile money et prépare une demande WhatsApp vers l'administrateur. L'écran
final explique qu'aucun paiement n'a encore été confirmé et que l'accès sera
activé après vérification manuelle. La table `User` demeure inchangée pendant
tout le parcours.

Périmètre prévu par la tranche : offre publique ; tunnel visuel protégé après
identification ; validation Zod ; états mobile ; couture unique
`membershipService.grantPremium` ; trace d'attribution ; réutilisation du script
d'administration ; documentation `docs/v2-paiement.md` ; tests prouvant
l'absence de promotion depuis le tunnel et l'absence de voie publique vers le
service d'attribution.

Hors périmètre contractuel : paiement réel, PSP, agrégateur, webhook, envoi
WhatsApp automatisé par une API, confirmation mensongère, écriture de
`membership` depuis le navigateur, dashboard administrateur, rôle `ADMIN`,
gestion de contenu et travaux des tranches 11–12.

DoD et pièges applicables : DoD commune complète ; aucune ligne `User` modifiée
par le tunnel ; `grantPremium` seul chemin d'écriture de `membership` ; aucun
appel public vers ce service ; pas de logo opérateur non autorisé ; prix issu
d'une source unique ; aucun faux webhook ; aucune donnée personnelle dans une
URL ou un log.

## Tests

Phase RED terminée, revue et relancée indépendamment par le chef-projet le
2026-08-09. Les tests sont désormais **gelés** : seul l'agent de tests peut être
rappelé selon la procédure de gouvernance.

Couverture figée — 17 cas Vitest et 4 parcours Playwright, soit 21 cas :

- repository PostgreSQL réel : structure de `MembershipGrant`, colonnes non
  nulles, relation `User`, index `userId`, promotion ciblée, trace atomique et
  absence de nouvelle attribution pour un compte déjà `PREMIUM` ; comptage des
  seuls contenus à la fois `PREMIUM` et publiés dans les quatre rubriques ;
- services : délégation unique de `membershipService.grantPremium` au
  repository et construction de l'offre publique avec les quatre volumes, la
  source de prix unique et l'état vide ;
- contrats : schéma Zod strict des quatre champs et des deux moyens ; aucune
  route ou Server Action vers `grantPremium` ; une seule primitive d'écriture
  de `membership` ; script CLI refactorisé ; transaction attribution + trace ;
  absence d'API WhatsApp, de faux webhook et d'autre écriture dans le tunnel ;
  documentation v2 et prix non dupliqué ;
- interface : frontières loading et error accessibles, sans fuite du détail
  interne ;
- E2E à 390 px : offre publique anonyme, prix unique à vie et volumes réels ;
  tunnel complet d'un membre `FREE`, e-mail en lecture seule, deux moyens,
  cibles tactiles, presse-papiers, URL WhatsApp sans query ni donnée
  personnelle, écran final honnête et snapshots `User`/`MembershipGrant`
  inchangés ; état empty réel ; non-régression d'un membre `PREMIUM`.

Revue avant gel : la première version ne prouvait ni que les volumes excluent
les contenus `FREE` et brouillons, ni l'état empty rendu, ni l'absence de trace
pendant le tunnel, ni la structure et l'index du modèle d'audit. Le même agent
de tests a renforcé ces preuves et la détection des écritures directes de
`membership` avant tout gel.

Preuve RED indépendante : Vitest ciblé échoue **17/17** pour absence des
modules, de la migration, du service unique, de la documentation et des écrans.
Playwright ciblé échoue **4/4** : `/premium` répond 404 et la table de trace
n'existe pas. Aucun test n'est vert avant implémentation ; typage et lint des
tests sont valides. Le commit tests-only est `07b236e` et aucun fichier de
pipeline n'a été modifié.

Empreintes SHA-256 gelées :

| Fichier                                                  | SHA-256                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `tests/components/premium-tunnel-states.test.tsx`        | `b5bf1ca453f971c4e7033932cb52e3b1fd5c15031babedd5fc5012f0d6a36fb9` |
| `tests/contracts/premium-contact-validator.test.ts`      | `4418e9c11d560e029668e7fb1fc64f95bda95dea971be1b2331fcc0b843022c0` |
| `tests/contracts/premium-tunnel-architecture.test.ts`    | `adda0f0c7850bfb38e9336a657108f044981b94eae03edf95d8ba1012c752083` |
| `tests/e2e/premium-tunnel-helpers.ts`                    | `5541a48821854910e959653952f038e86ccddc0077ed3a4bfc349a9f1930278c` |
| `tests/e2e/premium-tunnel.spec.ts`                       | `fe4f81f4c97cc75d5f4daf21352b2825e002140750c0817eb217f967cc0b1d1a` |
| `tests/repositories/membership-grant-repository.test.ts` | `74acd8cd9e2b363a1ebb6de5ca4affb16ddee7678c09a254cf130874fbcb0c0a` |
| `tests/repositories/premium-offer-repository.test.ts`    | `5bbb15ea0c13dd40684232a0484ff983293def1fc354207c66ba9bede4dc6e98` |
| `tests/services/membership-service.test.ts`              | `f2ca4b13b7978e00588c304ac6169159314dbf95058f4a6b6dc1131c4d14a224` |
| `tests/services/premium-offer-service.test.ts`           | `b705b3cf13fb3c2bb59eb0121ff0cf7bf08aa18f30048c951e41c04cac382c0d` |

## Itérations audit ↔ implémentation

| #         | Constats renvoyés                                                                                                                                                                                                                                                | Ce qui a été corrigé                                                                                                                                                                                                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pré-GREEN | Le locator E2E des volumes cherchait le premier texte « Prompts » dans toute la page et sélectionnait le lien caché du menu mobile, au lieu du libellé visible de l'offre dans `main`. Satisfaire ce faux échec aurait imposé de renommer la navigation globale. | Contestation acceptée selon gouvernance §4. Seul l'agent de tests a limité le locator au `main`, sans changer scénario ni assertion de volume. Commit tests-only `0f7324b`, nouvelle empreinte gelée ci-dessus ; 3/4 E2E passent et le seul échec restant est un vrai libellé à corriger dans l'interface. |
| Audit 1   | Contre-audit complet du HEAD stable `ac557b1`, comprenant les neuf empreintes, la recherche exhaustive des écritures `membership`, les réponses HTML/RSC anonymes et authentifiées, le runtime CLI, la transaction et la couture WhatsApp.                       | Verdict **CONFORME** : aucun constat bloquant, majeur ou mineur. L'auditeur a relancé migrations, seed, lint, typage, 295 tests, build, 33 E2E et audit npm ; il a aussi prouvé le comportement CLI compte absent, `FREE` puis déjà `PREMIUM`.                                                             |

## Décisions d'implémentation

- `/premium` vit dans le groupe public et force le rendu dynamique. La page
  serveur lit l'offre et la session en parallèle, puis ne sérialise vers le
  composant client que le DTO public et l'e-mail vérifié, ou `null` pour
  l'anonyme.
- Le repository de l'offre effectue quatre agrégations `count`, filtrées sur
  `visibility = PREMIUM` et `publishedAt != null`. Aucun corps de contenu n'est
  chargé pour afficher les volumes débloqués.
- Le prix public est défini une seule fois dans le contrat de l'offre et formaté
  en `FCFA` dans l'interface. Le numéro WhatsApp public possède également une
  source unique dans le composant du tunnel.
- Le tunnel est un automate client à quatre étapes — offre, récapitulatif,
  coordonnées, fin — sans `fetch`, Server Action, Route Handler ni écriture en
  base. Le formulaire strict copie le message dans le presse-papiers et ouvre
  uniquement `https://wa.me/33668823012`, sans query ni hash.
- La promotion et `MembershipGrant` sont écrits dans une même transaction. Un
  `updateMany` conditionné par `membership = FREE` rend l'opération idempotente :
  un compte absent ou déjà `PREMIUM` ne crée aucune trace.
- Le script d'administration résout l'e-mail côté serveur, appelle exclusivement
  `membershipService.grantPremium(userId, "grant-premium-cli")` et distingue
  clairement compte absent, attribution réussie et compte déjà Premium.
- `docs/v2-paiement.md` documente le futur webhook signé, son identifiant
  idempotent et l'appel au même service, sans exposer de route en v1.

## Écarts

### Écart ouvert E10-01 — dashboard administrateur incompatible avec la v1

Constat factuel : la demande évoque une validation du membre depuis un dashboard
administrateur qui n'existe pas. Or la tranche 10 exige qu'aucune route ni
Server Action publique ne puisse atteindre `grantPremium`, et la tranche 12
classe explicitement toute interface d'administration hors v1, l'adhésion étant
attribuée par script.

En quoi la tranche ne peut pas être exécutée sans arbitrage : ajouter ce
dashboard suppose au minimum un rôle `ADMIN`, son autorisation serveur, des
routes protégées, une interface, une piste d'audit et des tests d'élévation de
privilèges. Ce n'est ni un détail d'écran ni une préparation v2 ; cela contredit
directement le périmètre et la DoD de la tranche courante.

Proposition : garder le dashboard hors v1. Après vérification du paiement manuel
reçu sur WhatsApp, l'administrateur exécute la commande existante, refactorisée
pour appeler l'unique service `membershipService.grantPremium`. Le dashboard
sera conçu après la v1 avec une revue d'autorisation dédiée.

Tranches impactées : tranche 10 pour le chemin d'attribution ; tranche 12 pour
la liste hors v1 et la recette de l'absence de voie publique vers
`grantPremium`.

Décision humaine du 2026-08-09 : report validé. Le dashboard reste hors v1 et
l'administrateur utilise la commande sécurisée après vérification du paiement.
L'écart est clos ; la pipeline reste inchangée.

### Écart ouvert E10-02 — transmission de données personnelles à WhatsApp

Constat factuel : le navigateur ne peut pas envoyer silencieusement un message
WhatsApp sans intégration externe. Le lien `wa.me` peut seulement ouvrir une
conversation et éventuellement préremplir un paramètre `text`. Y placer le nom,
l'e-mail ou le téléphone inscrit ces données personnelles dans l'URL, les logs
et l'historique, ce qu'AGENTS.md interdit explicitement.

Proposition : valider les champs côté client, copier le récapitulatif dans le
presse-papiers, ouvrir `wa.me/33668823012` sans données personnelles dans l'URL,
puis demander à l'utilisateur de coller et envoyer. Aucune API WhatsApp, aucun
secret, aucune écriture en base et aucune promotion ne sont ajoutés.

Tranches impactées : tranche 10 uniquement ; `docs/v2-paiement.md` documentera
qu'une automatisation future exige une intégration officielle et une revue de
protection des données.

Décision humaine du 2026-08-09 : transfert explicite et quatre champs validés.
L'écart est clos ; la pipeline reste inchangée.

## Validation finale

État local stable audité : `ac557b1`.

- PostgreSQL : 11 migrations trouvées, schéma à jour ; seed réussi ;
- lint : réussi sans avertissement ;
- TypeScript strict : réussi ;
- Vitest complet : 85 fichiers, **295/295** tests réussis ;
- build Next.js : réussi ; `/premium` est dynamique ;
- Playwright Chromium officiel : **33/33** parcours réussis, dont les quatre
  parcours de tranche à 390 px ;
- audit npm : 0 vulnérabilité ;
- empreintes : 9/9 conformes après la correction de locator documentée ;
- `git diff --check` : propre ; aucun fichier `docs/pipeline-dev/` modifié ;
- contre-audit : **CONFORME**, sans constat ouvert ;
- preuve runtime supplémentaire : `/premium` anonyme répond 200 avec cache
  privé/no-store, le RSC anonyme porte `accountEmail: null`, et le RSC connecté
  porte uniquement l'e-mail issu de la session ;
- preuve CLI : compte absent → échec explicite ; compte `FREE` → `PREMIUM` et
  une trace ; second appel → déjà Premium et toujours une seule trace.

La validation distante, les URLs des deux PR et les exécutions CI seront
ajoutées sur la branche documentaire de clôture après fusion de la PR
d'implémentation.
