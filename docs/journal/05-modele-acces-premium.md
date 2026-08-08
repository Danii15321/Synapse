# Journal — tranche 05 : Modèle d'accès premium

- Démarrée le : 2026-08-08 / Terminée le : — / Statut : EN COURS

## Definition of Ready

Tranche précédente validée : oui — la tranche 04 est terminée, auditée, fusionnée sur `main` par la PR #5 et sa CI post-fusion est verte.

Écarts des journaux précédents pris en compte : tous les écarts des tranches 01 à 04 sont clos. La dérogation E04-01 reste applicable : Auth.js conserve les sessions PostgreSQL `database` et le contrat `SessionUser`, avec la passerelle Credentials interne validée ; aucun JWT n'est introduit.

Questions « À trancher » : toutes résolues à partir des deux références visuelles et de l'instruction produit du 2026-08-08. `docs/pipeline-dev/` est identique à `origin/main`, le worktree de départ est propre et la branche `feat/tranche-05-modele-acces-premium` est créée. La Definition of Ready est satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|
| Que montre le teaser d'un contenu premium ? | Titre, résumé, tags, badge premium et un extrait éditorial court stocké dans un champ `excerpt` distinct en base. Sur le détail, l'extrait reste lisible puis un faux aperçu flouté, purement décoratif et ne contenant aucun fragment du `body`, matérialise la suite verrouillée. Le bloc verrouillé entier est une cible tactile ; pour un anonyme, son appel à l'action mène à `/register`. Le `body` n'est jamais tronqué pour fabriquer l'extrait et n'est jamais envoyé à un utilisateur non entitled. | Porteur du projet, références visuelles et instruction « un extrait convertit mieux » du 2026-08-08 ; formulation sécurisée conforme à la recommandation de la tranche |
| Granularité du premium | Tout-ou-rien par contenu via `Prompt.visibility`, afin que contenus libres et premium coexistent dans une même liste comme sur la première référence. | Porteur du projet, références visuelles du 2026-08-08 ; recommandation de la tranche retenue |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : un prompt `PREMIUM` expose une promesse suffisamment concrète pour donner envie d'aller plus loin, mais son `body` ne se trouve jamais dans les données servies à un anonyme ou à un membre `FREE`. Après promotion par le script CLI, le même membre voit immédiatement le corps complet sans reconnexion.

Périmètre : enum `Visibility`, champs `visibility`, `excerpt` et `body` sur `Prompt` ; migration et seed ; point unique `canAccess` ; DTO `PromptTeaser` et `PromptFull` distincts ; repository à `select` conditionnel ; service de détail ; Route Handler et page de détail dynamiques ; `PremiumGate` purement visuel ; script traçable `grant-premium` ; absence de toute mutation publique de `membership`.

Hors périmètre : paiement ou tunnel premium ; gestion administrative web ; réplication aux autres rubriques ; finition complète de la rubrique Prompts de la tranche 07 ; enrichissement des ressources de la tranche 11 ; images de contenu et mécaniques sociales visibles sur les références.

Approche de conversion retenue dans l'analyse : l'extrait doit vendre le résultat et la spécificité du contenu, sans donner la procédure ni copier le début mécanique du corps. Le titre et le résumé orientent, l'extrait apporte la preuve de valeur, puis le bloc verrouillé présente un seul appel à l'action explicite. Le faux flou sert de signal de continuité, mais reste un décor inerte pour que la sécurité ne dépende jamais de CSS.

DoD commune applicable : livrable démontré à 390 px avec états explicites ; non-régression ; lint, types, tests et build verts ; quatre niveaux de tests ; PostgreSQL réel ; Zod strict aux frontières ; aucune fuite ; reproductibilité et commits conventionnels.

DoD spécifique : `body` absent du JSON brut pour anonyme et `FREE` ; absent du HTML et du payload RSC ; aucune route ou Server Action ne modifie `membership` ; promotion visible sans reconnexion ; `canAccess` appelée uniquement depuis les services ; deux DTO distincts ; le `body` n'est pas chargé en base sans entitlement.

Pièges retenus comme cas de test : filtrage tardif au mapping ; objet complet transmis à un composant client ; test React trompeur ; DTO à champ optionnel ; cache de page dépendant de session ; route d'administration pratique ; faux flou contenant réellement le corps premium ; extrait calculé par troncature du `body`.

## Tests

Phase RED terminée le 2026-08-08 par l'agent de test isolé, avant toute écriture de code applicatif.

- 31 nouveaux scénarios : 28 Vitest et 3 Playwright à 390 px, répartis dans 7 fichiers.
- Relecture du chef-projet : couverture de chaque case de DoD spécifique, des lignes applicables de DoD commune, du livrable et de chacun des six pièges ; quatre niveaux présents avec PostgreSQL 16 réel ; aucun test hors périmètre.
- Une correction avant gel a remplacé un faux `Error` renommé par une vraie instance de `ContentNotFoundError`, afin de préserver le mapping domaine fondé sur `instanceof`. Seul l'agent de test a effectué cette correction.
- Preuve RED relancée par le chef-projet : 28/28 nouveaux tests Vitest rouges, 0 nouveau test vert, tandis que les 93 tests hérités restent verts. Le scénario Playwright reste rouge avant démarrage du serveur de production parce que les types premium requis n'existent pas encore ; cet échec de compilation est valide en phase RED.
- Lint des tests vert ; type-check rouge uniquement sur l'absence attendue de `PromptTeaser` et `PromptFull`.
- Aucun code applicatif, test antérieur, fichier de pipeline ou journal n'a été écrit par l'agent de test.

Couverture : matrice `canAccess` ; service teaser/full et absence de chargement du corps ; repository à `select` conditionnel sur vraie base ; API brute anonyme/FREE/PREMIUM, 404, Zod strict et journalisation sans corps ; HTML/RSC sans fuite ; quatre états du détail ; faux flou décoratif et CTA `/register` ; DTO distincts ; absence de cache inter-utilisateurs ; promotion CLI tracée et visible sans reconnexion ; absence de mutation publique de `membership`.

Empreintes SHA-256 avant gel :

| Fichier | SHA-256 |
|---|---|
| `tests/services/premium-entitlement.test.ts` | `9447f724270d69ebe1dc0561d67c2ec8ed396011c93352392be8743953df8b97` |
| `tests/services/premium-prompt-service.test.ts` | `8c80fce9529e7a47f3396e63d29a8fe1c8043dc3923ff53f5f2356223540410f` |
| `tests/repositories/premium-prompt-repository.test.ts` | `2b63078e3e9991a62f8d9b294e2f18028e0b5d8026bec79251d18e43920c8197` |
| `tests/api/premium-prompt-route.test.ts` | `d01b01e50866626023f40ca7c53f4041646c12f3d4d52906057572d57511548a` |
| `tests/components/premium-prompt-page.test.tsx` | `af1f8fe3d84ce965d6daff035f7ace6d183706f22815126d351542c3590f2cd6` |
| `tests/contracts/premium-architecture.test.ts` | `295b96b93cd776f5b547a0b5fe95875bb761dc4847a9a80ac7bcc8a7085f9f0b` |
| `tests/e2e/premium-access.spec.ts` | `617f39be5210fb341fbaa43a7a8ba75f285629d3710099b2e512afac1f76deb7` |

Gel déclaré le 2026-08-08. Ces sept empreintes font foi : l'agent d'implémentation ne peut modifier aucun de ces fichiers.

Pendant GREEN, le test historique `tests/contracts/walking-skeleton.test.ts` a été contesté à juste titre : son premier scénario exigeait que `Prompt` reste limité aux six champs de la tranche 02 et interdisait précisément `body`, `visibility` et `tags`, désormais obligatoires en tranche 05. Le chef-projet a arbitré que le test contredisait la tranche courante et a rappelé l'agent de test. Celui-ci a conservé les six champs fondateurs, leurs types, l'unicité du slug et les timestamps, tout en retirant seulement l'interdiction des enrichissements futurs. Test ciblé : 6/6 vert ; suite : 121/121 verte. Nouvelle empreinte gelée : `63a9cedc281855a22574f0a672ae0579a9a10aa4e4080ca2569ea17ca0456ec4`.

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| GREEN-1 | Ancien contrat de tranche 02 contradictoire : le modèle `Prompt` devait rester limité à six champs et interdire les champs premium | Arbitrage du chef-projet selon gouvernance §4 ; seul l'agent de test a actualisé le scénario historique pour préserver le socle sans interdire l'évolution prescrite. Aucun test premium gelé n'a changé |
| GREEN-2 | Deux premiers runs E2E complets perturbés par la saturation concurrente du quota général ; une séparation de bucket par famille de route a rendu le troisième run vert | L'audit a ensuite démontré que cette séparation doublait le quota global et l'a refusée ; elle ne constitue donc pas une correction acceptable |
| AUDIT-1 | 1 MAJEUR : `/api/prompts` et `/api/prompts/[slug]` disposaient chacun de 60 requêtes/minute, contrairement au plafond général par IP. 1 MINEUR : accord « tous les prochaines ressources » | Renvoyé au même agent d'implémentation : restaurer le quota global, résoudre l'interférence E2E sans affaiblir la sécurité ni toucher aux tests, corriger le texte et nettoyer `next-env.d.ts` |
| AUDIT-2 | Quota applicatif corrigé et preuve croisée 60/61 conforme. 1 MAJEUR induit : les purges d'isolation Vitest/Playwright effaçaient `RateLimit` sans garantir une base locale/de test. 1 MINEUR restant : texte devenu « tous les toutes les prochaines ressources » | Renvoyé au même agent : garde de base fail-closed avant toute connexion Prisma, contre-preuve sur URL distante et correction exacte du texte ; aucun test gelé à modifier |
| AUDIT-3 | CONFORME — 0 bloquant, 0 majeur, 0 mineur. L'auditeur a vérifié la garde fail-closed avant Prisma, les refus de cibles distantes ou mal formées sans fuite d'URL, le quota global croisé 60/61, les huit empreintes gelées, l'absence de modification de la pipeline et l'ensemble des commandes de validation | Aucune correction supplémentaire. `next-env.d.ts`, régénéré par les builds de contrôle, a été restauré par l'agent d'implémentation sans autre modification |

## Décisions d'implémentation

- Le faux flou du `PremiumGate` est construit avec des blocs décoratifs `aria-hidden` et ne reçoit aucune donnée issue du `body`. Le bloc verrouillé entier reste un lien tactile vers `/register`, ce qui réduit la friction pour l'anonyme tout en gardant l'extrait éditorial lisible avant l'appel à l'action.
- Le repository effectue deux lectures minimales : métadonnée de visibilité, puis ligne avec `body: entitled`. Le service est l'unique appelant de `canAccess` et produit deux DTO réellement distincts ; aucun champ sensible optionnel n'est utilisé pour simuler le verrouillage.
- Le quota général reste un bucket global partagé entre liste et détail. Pour rendre les suites reproductibles sans affaiblir ce plafond, Vitest et Playwright sont sérialisés et ne purgent que la table technique `RateLimit` entre scénarios pertinents.
- Toute purge de données de test passe par une garde commune fail-closed avant création du client Prisma. Seule la cible PostgreSQL locale exacte (`synapse` / `synapse` sur boucle locale et port 5432) est admise ; toute cible distante, mauvaise base, mauvais utilisateur, mauvais port, URL absente ou mal formée s'arrête avec un message générique.
- Les trois migrations ont été générées par Prisma pour introduire les champs, rendre les valeurs premium obligatoires et préserver la compatibilité des écritures existantes. La seed fournit un prompt libre et un prompt premium avec extrait éditorial distinct.
- La promotion v1 reste une opération CLI explicite et tracée (`grant-premium`) ; aucune route publique ni Server Action ne peut modifier `membership`.

## Écarts

Aucun écart ouvert au démarrage.

## Validation finale

Validation locale terminée le 2026-08-08 :

- `npm run lint` : vert ;
- `npm run type-check` : vert ;
- `npm run test` : 33 fichiers et 121/121 tests verts ;
- `npm run build` : vert, routes dynamiques `/api/prompts/[slug]` et `/prompts/[slug]` produites ;
- `npm run e2e` : 11/11 scénarios verts à un worker, dont absence du `body` dans JSON, HTML et RSC pour anonyme/FREE, promotion visible sans reconnexion et absence de contamination de cache ;
- `npm audit` : 0 vulnérabilité ;
- preuve HTTP croisée : 60 appels de liste acceptés, puis détail refusé en 429 avec `Retry-After`, donc quota global inchangé ;
- validation visuelle dans le navigateur intégré à 390 × 844 : titre sur deux lignes lisibles, extrait visible, badge premium, bloc verrouillé décoratif, aucun débordement horizontal (`scrollWidth` 375 pour un viewport utile de 390 avec barre de défilement), cible complète menant à `/register`, aucun message console ;
- les huit empreintes de tests gelées sont exactes, `git diff --check` est propre et `docs/pipeline-dev/` est identique à `origin/main`.

Validation distante, PR, fusion et CI post-fusion : en attente.
