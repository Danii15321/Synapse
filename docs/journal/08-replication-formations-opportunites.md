# Journal — tranche 08 : Réplication Formations et Opportunités

- Démarrée le : 2026-08-08 / Terminée le : 2026-08-08 / Statut : TERMINÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 07 et son amendement Claude sont fusionnés dans `main`; la CI post-fusion est verte.

Écarts des journaux précédents pris en compte : E04-01 reste applicable à la stratégie de sessions PostgreSQL `database`. E06-01 demeure reporté au premier déploiement HTTPS public ou à la tranche 12. Les autres écarts sont clos et aucun n'empêche la tranche 08.

Questions « À trancher » : résolues par le porteur le 2026-08-08. Le fichier de tranche est inchangé, l'arbre initial est propre et la branche `feat/tranche-08-formations-opportunites` est créée. La Definition of Ready est satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » ou précision produit | Réponse retenue | Tranchée par |
|---|---|---|
| Formation dont la date est passée | Deux natures orthogonales au niveau d'accès : une formation événementielle est liée à une date et expire après cette date, donc sort de la liste principale ; une formation permanente reste consultable sans limite temporelle. | Porteur du projet le 2026-08-08 |
| Opportunités périmées | Une opportunité après sa `deadline` sort de la liste principale et aucune archive consultable n'est livrée en v1. | Porteur du projet le 2026-08-08 |
| Inscription à une formation | Seule une formation événementielle donne lieu à une inscription. Une formation permanente est un contenu formatif consultable et ne demande aucune inscription. Le chemin d'écriture d'inscription reste réservé à la tranche 09 ; la tranche 08 ne l'anticipe pas. | Porteur du projet le 2026-08-08 ; frontière de tranche imposée par la pipeline |
| Gratuit versus premium | Les deux natures de formation peuvent chacune être `FREE` ou `PREMIUM`. Le type temporel et la visibilité premium sont deux axes indépendants ; le verrouillage serveur s'applique dans les quatre combinaisons. | Porteur du projet le 2026-08-08 |
| Représentation technique de la nature | Le champ est nommé `kind` et s'appuie sur l'enum `FormationKind` avec les valeurs `PERMANENTE` et `EVENEMENTIELLE`. `startsAt` reste nullable en base, mais le contrat Zod l'exige pour `EVENEMENTIELLE` et le refuse pour `PERMANENTE`. | Arbitrage technique du chef-projet le 2026-08-08, dérivé des deux natures décidées par le porteur |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : à 390 px, un visiteur parcourt Formations et Opportunités avec la même ergonomie que Prompts, ouvre leurs détails et constate le même verrouillage premium. Les formations permanentes restent visibles ; les formations événementielles passées et les opportunités périmées n'apparaissent plus dans les listes principales. Les contrats de ressources permettent de créer deux exemples réels par rubrique.

Périmètre : modèles et migrations Formation/Opportunite ; nature événementielle ou permanente des formations ; niveaux, formats, durées et dates ; types, organismes, deadlines et liens externes des opportunités ; validateurs stricts ; repositories paginés et filtrés en base ; services teaser/full via `canAccess` ; API ; accès HTTP partagé ; composants et pages liste/détail ; états loading/error/empty/success ; métadonnées publiques sûres ; verrouillage de `body` et de `externalUrl` ; contrats et quatre exemples ; mise à jour explicite du patron si une divergence réelle est constatée.

Hors périmètre : mécanisme d'inscription aux formations événementielles ou aux jeux, écriture utilisateur, désinscription, archives d'opportunités, paiement réel, administration, import industrialisé de tout le contenu réel, upload, notifications et toute capacité des tranches 09 à 12.

DoD commune applicable : démonstration navigateur 390 px ; quatre états ; non-régression 01–07 ; lint, typage, tests et build verts ; architecture en couches ; Zod strict ; vraie base pour les repositories ; JSON/HTML/RSC sans champs premium ; audit des dépendances ; reproductibilité et documentation.

DoD spécifique : jeu complet du patron répliqué pour les deux rubriques ; gating JSON brut par rubrique ; opportunité expirée absente ; `externalUrl` absent du JSON et du HTML pour les non-entitled ; deux contrats et deux exemples réels chacun ; patron actualisé de toute divergence ; structure homogène avec Prompts.

Pièges retenus comme cas de test : verrouiller `body` mais pas `externalUrl` ; filtrer l'expiration dans le composant ; expirer une formation permanente ; conserver un événement passé dans la liste ; adaptations silencieuses du patron ; couverture de tests allégée ; listes ou migrations sans index sur les colonnes filtrées ; fuite premium dans JSON/HTML/RSC ou métadonnées.

## Tests

Phase RED terminée et relue par le chef-projet le 2026-08-08. Les tests sont
désormais **gelés** : l'agent d'implémentation ne peut modifier aucun des
fichiers ci-dessous.

Couverture figée — 46 cas Vitest effectifs et 2 parcours Playwright, plus le
contrat historique du seed Prompts recentré sur sa rubrique :

- modèle et repositories : schémas, enums, index, publication, événements
  passés, permanentes non expirables, opportunités expirées sans archive,
  sélections de carte sans champ verrouillé, filtres combinés, curseur sur 205
  lignes et absence de N+1 ;
- services : les quatre combinaisons `kind × visibility`, programme permanent
  gratuit sans inscription, teasers anonymes/FREE, plein accès PREMIUM à
  `body` et `externalUrl`, pagination bornée et rejet Zod de toute row
  repository incomplète ;
- API : listes et détails, query Zod stricte, rejet d'un `membership` forgé,
  `errorId` corrélé au log sur les 400, gating brut anonyme/FREE, réponses
  PREMIUM et 404 générique d'une opportunité expirée ;
- interface : cartes homogènes au patron, ratio 4/3, natures et accès
  indépendants, contenu permanent sans inscription, extraits de conversion,
  CTA membre, aucun lien de candidature non entitled, et états
  loading/error/empty/success/not-found ;
- contrats : README et deux exemples par rubrique, cohérence
  `kind`/`startsAt` explicitement renseignée, HTTPS strict pour le lien externe
  dans la ressource comme dans le DTO complet et mise à jour explicite du
  patron ;
- E2E à 390 px : expiration et absence d'archive, ratio 4/3 réellement mesuré,
  absence de débordement, puis preuve que les sentinelles `body` et
  `externalUrl` sont absentes du JSON, du HTML et du RSC pour anonyme/FREE et
  présentes exactement pour PREMIUM.

Preuve RED du chef-projet : les 13 fichiers Vitest exécutables sont rouges
(`13 failed`, les modules applicatifs n'existent pas encore ; les deux
assertions atteintes échouent sur les tables PostgreSQL et le patron absents).
Playwright est rouge avant démarrage du serveur parce que le type-check de la
tranche absente échoue. Aucun nouveau test n'est vert. Les fichiers de pipeline
et `next-env.d.ts` ont un diff vide.

Empreintes SHA-256 gelées :

| Fichier | SHA-256 |
|---|---|
| `tests/api/formations-opportunites-entitled-route.test.ts` | `8801452c95c10d89dc2fae1583634e0e8b93f5bd64bd3a5edd0e04933123cb48` |
| `tests/api/formations-opportunites-routes.test.ts` | `0c0521169dd96a4bcf4eaef56ccd9b49ea19a5959f8408d8f5fe479d088fb65d` |
| `tests/components/formations-opportunites-states.test.tsx` | `70b40f7a670f9cb7d66d95a194e58352366929d5b8f81dda96ab3e3b43cc2863` |
| `tests/components/formations-opportunites-ui.test.tsx` | `a597b437d09e7850ba617c67bfba5b19b4b714e20d08a14624962d6e9995161e` |
| `tests/contracts/formations-opportunites-pattern.test.ts` | `1d65d51de2876847969f2c89a87d9643c3469e844970772c49a3e89428a24b88` |
| `tests/contracts/formations-opportunites-resources.test.ts` | `c05e4000edd393bc5957eb154f86153261583110c674f92d2d4da70b1959f658` |
| `tests/contracts/opportunite-resource-validator.test.ts` | `0d7311777241c55a0859d6730f4ac60e8263c46fafb99f72576a3387b095b963` |
| `tests/contracts/walking-skeleton.test.ts` | `51d6952f4df2bad3ed4585fe39b0d8ccda902f1badad9958ba638631f6f16af0` |
| `tests/e2e/formations-opportunites-helpers.ts` | `58c6b4227fee43f2aa053e32990eace7d3165722cc02210bf45f967b2f6b6c3d` |
| `tests/e2e/formations-opportunites.spec.ts` | `4cb9f80805ae3eaa99afb00a5fbe19bf9444321f1fa0904079997e52178a9e20` |
| `tests/repositories/formations-opportunites-filters.test.ts` | `6bc5673907d654416b805c468bd426a8919486dae8f31fede6331850c34d9a43` |
| `tests/repositories/formations-opportunites-model.test.ts` | `3bc17f5a92364d6ebfbb70d0b0532ec80e1e74ba8abdd885edcb45cc0f3ee495` |
| `tests/repositories/formations-opportunites-pagination.test.ts` | `8f6b1876a633e5b4e87b095de850b319f36a1f3818c7a43ffa14d98c0b0e2541` |
| `tests/repositories/formations-opportunites-repository.test.ts` | `d8c27028927ca6ac63070fb01def7ac5c3381c7c14a31a51f07bd1136c93ced2` |
| `tests/repositories/replicated-content-fixtures.ts` | `6203b4c95284099b54a6e8aed761e168dfa04cb34179a3f17cc14ac7a2a1ff88` |
| `tests/services/formations-opportunites-catalog-service.test.ts` | `2fc1356cd530d3e7bd2e0f4bc6fa081b5c7388ab2dc3349212a49fa0362ecdd7` |
| `tests/services/formations-opportunites-service.test.ts` | `9cfc5cafb10958826c68c9f0c5217a3056982cb92d1e74028255756f31992784` |

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| Pré-GREEN | Le test de modèle cherchait systématiquement `"kind"`, `"level"` et `"type"` dans `pg_indexes.indexdef`, alors que PostgreSQL rend les identifiants minuscules non guillemetés. Les index réels existaient. | Après arrêt conforme de l'agent d'implémentation et arbitrage du chef-projet, l'agent de test a remplacé la recherche littérale par une regex de nom de colonne acceptant les guillemets optionnels sans changer les sept colonnes exigées. Test vert sur PostgreSQL réel ; nouvelle empreinte gelée consignée. |
| Pré-GREEN 2 | Le test du validateur Opportunité choisissait le premier objet Zod exporté et recevait donc le schéma de carte au lieu du schéma éditorial annoncé par son scénario. | Après un second arrêt conforme et arbitrage du chef-projet, l'agent de test a aligné le sélecteur sur le voisin Formation : export dont le nom correspond à `resource|import`. Les quatre assertions métier sont inchangées ; test vert et nouvelle empreinte gelée. |
| Pré-GREEN 3 | Les helpers du test de pagination des services réduisaient les exports à `Function`, puis les retournaient comme fonctions métier précisément typées ; `tsc` échouait indépendamment de l'implémentation. | L'agent de test a ajouté deux vrais types de module et leurs gardes, sans assertion forcée ni `any`. Scénario, mocks et assertions sont inchangés ; test ciblé et type-check verts, nouvelle empreinte gelée. |
| Pré-GREEN 4 | L'E2E exigeait un statut 404 sur une page App Router munie de `loading.tsx`. Next.js renvoie officiellement 200 pour un `notFound()` découvert après le début du streaming, même si l'UI introuvable et `noindex` sont corrects. Supprimer le loading aurait contredit un autre test ; interroger PostgreSQL dans le proxy aurait violé l'architecture. | L'agent de test a remplacé cette preuve impossible par un 404 sur le Route Handler non streamé, puis une navigation vérifiant l'UI introuvable et l'absence du titre, du corps et du lien expirés. Les deux parcours Playwright sont verts ; nouvelle empreinte gelée. |
| Audit 1 | Verdict non conforme : suite complète rouge à cause du comptage global des upserts ; quatre branches de service contournaient les DTO pour satisfaire des mocks incomplets ; le DTO Opportunité complet acceptait des protocoles non HTTPS ; les 400 de listes n'avaient ni `errorId` ni log ; l'exemple permanent omettait `startsAt`. | Après arbitrage du chef-projet, l'agent de test a recentré le contrat historique sur `db.prompt.upsert`, complété les rows nominales, ajouté la preuve de rejet Zod des quatre rows incomplètes, exigé HTTPS sur le DTO complet, corrélé les deux erreurs 400 et rendu `startsAt` obligatoire dans les exemples. Preuve RED : 5 échecs attendus et 41 verts sur les 46 cas tranche ; type-check vert. Six nouvelles empreintes gelées. |
| Audit 2 | Contre-audit complet après correction des cinq constats. | **CONFORME** : 17 empreintes exactes, parsing DTO systématique, HTTPS de bout en bout, erreurs 400 corrélées, seed à six upserts idempotents et contrat permanent explicite. Lint, typage, 223 tests, build, 23 E2E, migrations, seed et audit des dépendances verts ; aucun constat résiduel. |

## Décisions d'implémentation

- Avant gel des tests : représentation technique figée en `kind: FormationKind` (`PERMANENTE | EVENEMENTIELLE`) afin que les contrats PostgreSQL, ressources et API testent une forme unique. L'invariant conditionnel de `startsAt` vit à la frontière Zod ; la colonne reste nullable pour permettre le cas permanent.

## Écarts

Aucun écart ouvert. Les quatre corrections exceptionnelles de preuves
pré-GREEN et la remise en cohérence post-audit ont été arbitrées et consignées
dans les itérations ; elles n'ont nécessité aucune modification de pipeline ni
aucun écart produit.

## Validation finale

Validation indépendante du chef-projet le 2026-08-08 :

- `npm run lint` : vert, zéro avertissement ;
- `npm run type-check` : vert ;
- `npm run test` : 64 fichiers, **223/223** tests verts ;
- `npm run build` : vert, 24/24 pages générées et huit routes
  Formations/Opportunités présentes ;
- `npm run e2e` avec les reporters configurés : **23/23** parcours verts,
  dont 2/2 tranche 08 à 390 px ;
- les E2E mesurent le ratio 4/3 et l'absence de débordement, prouvent
  l'expiration et l'absence d'archive, puis l'absence de `body` et
  `externalUrl` dans JSON, HTML et RSC pour anonyme/FREE ;
- `npm audit --audit-level=high` : zéro vulnérabilité ;
- PostgreSQL 16 : sain ; `npx prisma migrate status` : 9 migrations, schéma à
  jour ; seed rejouable et réussi ;
- 17/17 empreintes gelées vérifiées ; migration tranche 08 :
  `91e69036d54122b7ed678b5a2fe776d46ee5d8bc54e8fe77e6ed54aef1136a87` ;
- `git diff --check` : vert ; `docs/pipeline-dev/` : aucun diff ;
  `next-env.d.ts` : restauré, aucun diff ;
- audit final : **CONFORME — aucun constat résiduel**.
