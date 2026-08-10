# Journal — tranche 11 : Enrichissement depuis `ressources/`

- Démarrée le : 2026-08-10 / Terminée le : 2026-08-10 / Statut : TERMINÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 10 est terminée, auditée et fusionnée ; la CI post-fusion de `main` est verte.

Écarts des journaux précédents pris en compte : E09-01 implique que de futures formations événementielles pourront recevoir des participations, mais aucune formation réelle n'est fournie pour cette tranche. E10-01 maintient l'interface d'administration hors v1 ; la décision de mise à jour éditoriale par interface admin vise l'après-v1. Les autres écarts antérieurs sont clos ou sans effet sur la tranche 11.

Questions « À trancher » : les trois questions du fichier de tranche ont reçu une réponse. L'arbitrage supplémentaire rendu le 2026-08-10 autorise l'enrichissement déterministe des 69 fichiers réels et fixe leur répartition à 20 `FREE` et 49 `PREMIUM`. La Definition of Ready est satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » ou précision produit | Réponse retenue | Tranchée par |
|---|---|---|
| Versionnement de `ressources/` | Le dossier entier ne doit pas être versionné dans Git. Il doit être ignoré et une procédure d'approvisionnement/import doit être documentée. | Porteur du projet le 2026-08-10 |
| Mise à jour du contenu après la v1 | Les mises à jour se feront via une interface d'administration après la v1. Aucune interface d'administration n'est ajoutée dans cette tranche. | Porteur du projet le 2026-08-10 |
| Volume attendu | Dimensionner et vérifier sur le volume réel de la rubrique Prompts, actuellement la plus complète : 69 fichiers. Conserver la pagination par curseur et la recherche simple tant que les mesures restent satisfaisantes. | Porteur du projet le 2026-08-10 |
| Source éditoriale de la tranche | Importer uniquement `ressources/PROMPTS/`, avec cette casse. Ne pas importer `ressources/prompts/`, qui contient les anciens exemples peu détaillés. | Porteur du projet le 2026-08-10 |
| Rubriques sans contenu réel | Aucune formation ni opportunité réelle n'est disponible. Comme seule la source `ressources/PROMPTS/` est autorisée, aucune donnée de démonstration ne doit subsister dans Formations, Opportunités ou Jeux après le seed. | Porteur du projet le 2026-08-10 ; conséquence directe du périmètre explicite |
| Métadonnées absentes des 69 prompts | Conserver intégralement chaque corps ; générer des slugs, résumés et extraits publics indépendants du corps ; mapper les six dossiers vers les quatre domaines fermés ; répartir 20 prompts `FREE` et 49 `PREMIUM`, proportionnellement entre les dossiers avec au moins un gratuit dans chacun. | Proposition du chef-projet validée et ratio ajusté par le porteur le 2026-08-10 |

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : sur une base vide, le seed importe les 69 prompts réels depuis `ressources/PROMPTS/`, produit un rapport détaillé et rejouable, puis la plateforme permet de les parcourir sur 390 px sans fuite des corps premium. Les trois autres rubriques sont vides plutôt que peuplées de démonstrations.

Périmètre : importeur validé, normalisation, upsert, suppression contrôlée des données de démonstration, rapport d'import et répartition FREE/PREMIUM, adaptation au volume réel, rendu sûr du Markdown et documentation de l'approvisionnement d'un dossier non versionné.

Hors périmètre : interface d'administration, paiement réel, création de formations/opportunités/jeux, recherche full-text sans besoin mesuré, modification de la pipeline.

DoD spécifique à couvrir : erreur fichier+champ, rejouabilité, mise à jour par slug, HTML malveillant inerte, rapport FREE/PREMIUM, extrêmes de longueur à 390 px, aucune donnée de démonstration résiduelle. DoD commune applicable : chaîne qualité complète, PostgreSQL réel, API/HTML brut pour le gating, navigation E2E et reproductibilité documentée.

Pièges retenus comme cas de test : absence de validation, création au lieu d'upsert, visibilité implicite, HTML exécutable, slugs accentués ou avec espaces, pagination/rendu non éprouvés au volume réel et dépendance silencieuse à un dossier éditorial absent d'un clone.

## Tests

Phase RED terminée et gelée le 2026-08-10 : **18 scénarios**, soit 15 Vitest et 3 Playwright.

- Service, 4 scénarios : transformation des 69 fichiers bruts sans perte du corps ; métadonnées, domaines, tags et visibilités explicites ; quotas 20/49 et répartition par dossier ; fichier invalide avec chemin+champ ; collision de slugs normalisés.
- Repository PostgreSQL réel, 6 scénarios : remplacement explicite des anciennes données de démonstration ; source uppercase exclusive ; rejouabilité ; mise à jour par slug sans doublon ; rapport complet ; rejet bruyant et motivé.
- Route Handlers, 3 scénarios : catalogue de 69 cartes sans corps ; détail premium importé sans fuite JSON pour anonyme et membre `FREE`.
- Contrats, 2 scénarios : aucun fichier `ressources/` suivi par Git ; procédure autonome d'approvisionnement et de réimport.
- E2E à 390 px, 3 scénarios : 69 contenus sous réseau 3G, fallback 4/3 et extrêmes de longueur ; absence du corps premium importé dans HTML/RSC pour anonyme et `FREE` ; HTML malveillant conservé comme texte mais jamais exécuté.

Revue pré-gel du chef-projet : le premier jet inventait un chemin `coverImage` pour les sources sans image et ne prouvait pas réellement la suppression des données de démonstration. L'agent de tests a été rappelé avant gel : `coverImage: null` représente désormais le fallback existant, l'E2E mesure son ratio 4/3 et le scénario PostgreSQL précharge quatre anciennes lignes avant de prouver leur suppression. Une seconde revue a ajouté la preuve HTML/RSC sur un prompt premium importé, en complément du JSON brut.

Preuve RED indépendante du chef-projet : **15/15 Vitest échouent** sur les comportements absents ; **3/3 Playwright échouent** après build sur l'absence de l'import réel. PostgreSQL est réellement utilisé. Lint, type-check et `git diff --check` sont verts selon l'agent de tests ; aucun code applicatif ni fichier pipeline n'a été modifié.

Empreintes SHA-256 gelées :

| Fichier | SHA-256 |
|---|---|
| `tests/fixtures/resource-import-test-utils.ts` | `4d2ad14cf4f04c991462449a755cc31ff71b11deb2fd4e38f7a083e6b3b2c006` |
| `tests/services/resource-import-service.test.ts` | `411e3eaf33100cb51b3e430b135438760cdc1f034b16c163aaa6c81ab69b5afc` |
| `tests/repositories/resource-import-repository.test.ts` | `7ce46b3a3699fd61cf6924f7f6e1d564caee0656944ba3c9896621a21d09a31f` |
| `tests/api/resource-import-routes.test.ts` | `d6808dd9de6d249efeaac94956704d461c1cc909fe07d5516596259433cb12b4` |
| `tests/contracts/resource-import-boundary.test.ts` | `523067eb937b16cc6f3e195404049dd3af5c45e865fa9505b06d060f83f95217` |
| `tests/e2e/zz-resource-enrichment.spec.ts` | `c677222d9e1fb3bc7a774d5de5cf6a454bc77f878061d2ba4802143ce6d8555f` |

### Arbitrage post-gel des contrats historiques

La première suite complète GREEN a produit 304/310 tests verts. Cinq échecs provenaient de contrats historiques incompatibles avec la tranche courante : le walking skeleton exigeait encore deux `upsert` littéraux dans le seed, le premier test repository exigeait encore exactement deux prompts, et trois requêtes `pg_enum` non limitées au schéma `public` comptaient les enums des schémas PostgreSQL isolés créés par les tests de tranche 11.

Arbitrage selon `gouvernance.md` §4 : ces tests contredisaient le remplacement explicite du seed embryonnaire ou manquaient d'isolation. L'agent d'implémentation s'est arrêté sans les modifier. L'agent de tests a été rappelé pour : vérifier la délégation du seed à l'importeur sans données démo codées en dur ; comparer les deux états successifs sans figer un volume historique ; joindre `pg_namespace` et filtrer `public` sans changer les valeurs d'enum attendues. Les 18 tests corrigés ciblés sont verts ; la suite atteint 309/310, le dernier échec étant un vrai défaut applicatif rendu à l'implémentation.

Nouvelles empreintes gelées des cinq contrats corrigés ; les six empreintes de tranche ci-dessus restent inchangées :

| Fichier historique corrigé | SHA-256 |
|---|---|
| `tests/contracts/walking-skeleton.test.ts` | `68caa65f7f0dc2f065cb566453a9e89fba7c4132d48cb93b191c8e697ffde279` |
| `tests/repositories/prompt-repository.test.ts` | `52b035d8f70e88a661711a0be67c5278337a1ec63079531ce4bb14a83adf6c4e` |
| `tests/repositories/prompt-catalog-model.test.ts` | `d775c330f8a802b1bf697d36fbde6501e0578cddb5e7588146da356e4a06370f` |
| `tests/repositories/premium-prompt-repository.test.ts` | `9e349fcd90344a29d97fa245e008ef8b0b53dd4e79612a36544052c73b914bfd` |
| `tests/repositories/formations-opportunites-model.test.ts` | `33537d61be0bf9d341e593c4dfeb157dff4c77b44479314815ce80e58a84a6eb` |

La première suite E2E complète a ensuite atteint 32/36. Quatre contrats navigateur hérités supposaient encore un seed de deux lignes, qu'un prompt `FREE` arbitraire figurait sur la première page, ou qu'un corps et son JSON étaient monolignes. L'agent d'implémentation s'est de nouveau arrêté sans toucher aux tests. Arbitrage : conserver toutes les garanties fonctionnelles en rendant les preuves compatibles avec la pagination et le Markdown réel — page non vide et bornée, recherche avant carte→détail, parsing JSON pour comparer `body`, comparaison déterministe du texte Markdown visible au lieu d'exiger un nœud DOM unique.

Le chef-projet a relancé indépendamment les quatre fichiers : **13/13 Playwright verts**. L'agent de tests a relancé la suite complète : **36/36 verts**. Les onze empreintes précédentes restent inchangées ; quatre contrats E2E rejoignent le gel :

| Fichier E2E historique corrigé | SHA-256 |
|---|---|
| `tests/e2e/prompts.spec.ts` | `92b68100aa1d87e1b901d76fc03f7ae10c1abdccba9614653d81a122d5b8f1f6` |
| `tests/e2e/prompt-reference.spec.ts` | `e8dd78929bd79b042a5ce7f1ed7f5bdfd8e6aa1ea56c90d3cdbec11e764a0c6d` |
| `tests/e2e/premium-tunnel.spec.ts` | `304c022bea8748510d63d187c66f341df4e35a09fb9f1eb181d6f29640383922` |
| `tests/e2e/premium-access.spec.ts` | `30d6c784438d7a52e1769249f0466e740c84000fc93d6708f522d5443ae426f3` |

### Arbitrage post-gel de la CI sans `ressources/`

Après recréation du dépôt, le premier run GitHub réel `31358224623` a atteint 304/310 tests. Six échecs `ENOENT` provenaient de trois contrats historiques qui exigeaient encore des fichiers éditoriaux locaux : le logo source, l'ancien contrat lowercase `ressources/prompts`, ainsi que les exemples de formations et opportunités. Ces attentes contredisent désormais trois décisions explicites : le dossier entier n'est plus versionné, seule la source uppercase PROMPTS alimente la tranche 11, et aucune formation/opportunité réelle n'est fournie.

Arbitrage selon `gouvernance.md` §4 : l'échec n'est pas corrigé par le code applicatif ni par la réintroduction de contenus réels en CI. L'agent de tests est rappelé pour préserver les garanties pertinentes avec des preuves versionnées et reproductibles — actifs publics dérivés, documentation/validateurs d'import et absence de données de démonstration — sans skip conditionnel ni dépendance au dossier local ignoré. Nouveaux hashes et preuves à consigner après correction.

Après trois exécutions ciblées, 15/16 tests étaient verts ; le dernier matcher attendait « sont supprimées » alors que la documentation emploie correctement « contenus [...] sont supprimés ». La règle d'arrêt a été appliquée. Le porteur du projet a explicitement autorisé la correction textuelle et la reprise le 2026-08-10.

Commit tests-only `b0f1e8d` : 16/16 ciblés, 310/310 Vitest local, puis 310/310 dans un clone frais initialement sans `ressources/` après `npm ci` et provisionnement synthétique identique à la CI. Lint, type-check, Prettier et diff-check verts ; 15/15 empreintes précédentes inchangées. Nouvelles empreintes gelées :

| Contrat historique rendu reproductible | SHA-256 |
|---|---|
| `tests/contracts/shell-identity.test.ts` | `8fea306299be5e718ed9fcf28ba8a27b01b2d2c3fd31a011a34742b2415373be` |
| `tests/contracts/prompt-resources.test.ts` | `c457356968fa3cbdda5c12d68869e8c0178a960b43b073bdad6f927b9276f3f5` |
| `tests/contracts/formations-opportunites-resources.test.ts` | `2890cfa8a55369b63b01167ca0465a935fa923102bf450e8a6db785f370f4f64` |

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| 1 | Suite E2E à 34/36 : le rendu du corps ajoutait des lignes vides ; deux assertions E2E pouvaient recopier les corps premium dans leurs diagnostics ; les 69 sources restent accessibles dans l'historique Git malgré leur retrait de l'index. | `PromptBody` restitue désormais exactement le texte normalisé tout en gardant le HTML inerte. Les deux assertions comparent des SHA-256 et ne journalisent plus le contenu. L'historique Git reste soumis à arbitrage humain dans E11-02. |
| 2 | Ré-audit des deux corrections non destructives. | Conforme : 310/310 Vitest, 36/36 Playwright, mutation contrôlée détectée avec diagnostics expurgés, 15/15 empreintes gelées conformes. Aucun nouveau constat applicatif. |
| 3 | Audit final après purge, recréation du dépôt et correction des contrats CI dépendant auparavant du dossier local ignoré. | Conforme : les 18 empreintes gelées sont intactes, le clone frais sans `ressources/` passe 310/310 Vitest après provisionnement synthétique, les arbres Git locaux et distants sont exempts de `ressources/`, et les CI de la PR d'implémentation puis de `main` sont vertes. |

## Décisions d'implémentation

- Le parseur accepte le format réel `## titre` / `Modèle Cible :` / `### Prompt :`, valide chaque frontière avec Zod et conserve intégralement le corps.
- Les métadonnées publiques sont dérivées uniquement du titre et du dossier ; aucun résumé ni extrait public ne reprend le corps potentiellement premium.
- La synchronisation transactionnelle supprime les anciennes démonstrations des quatre rubriques, retire les prompts absents de la source et met à jour les prompts présents par slug.
- Le seed délègue à un service serveur isolé. En CI, 69 ressources synthétiques et éphémères sont provisionnées uniquement si `CI=true` et seulement quand aucune source locale n'existe.
- La répartition FREE/PREMIUM est déterministe : 20/49 au total, avec les quotas validés par dossier.
- Le Markdown éditorial est rendu par des éléments React sûrs, jamais par injection HTML ; le texte visible reste identique au corps normalisé.
- Les comparaisons E2E portant sur un corps complet utilisent des empreintes SHA-256 afin qu'un échec ne journalise jamais le contenu premium.

## Écarts

### Écart ouvert E11-01 — le contenu réel ne respecte pas le contrat de ressources

Constat factuel : les 69 fichiers de `ressources/PROMPTS/` commencent directement par un titre, une liste de modèles cibles et le corps du prompt. Ils ne contiennent pas le frontmatter obligatoire défini en tranche 07 : `slug`, `summary`, `excerpt`, `domain`, `tags`, `visibility` et `publishedAt` sont absents. Le dossier historique `ressources/prompts/` respecte ce contrat mais son contenu est explicitement exclu par le porteur.

En quoi la tranche ne peut pas démarrer telle quelle : la tranche 11 impose une validation Zod de chaque ressource et interdit une valeur de visibilité implicite. Inventer une visibilité ou un extrait dans les tests figerait une décision éditoriale non prise et pourrait publier gratuitement un contenu destiné au premium.

Proposition soumise à validation humaine : conserver intégralement le corps des 69 fichiers, enrichir leur métadonnée de façon déterministe lors de la préparation/import, mapper les dossiers vers les domaines fermés, fabriquer des résumés et extraits publics indépendants du corps verrouillé, et publier environ 20 % du catalogue gratuitement — au moins un exemple par dossier — le reste en `PREMIUM`. La liste exacte doit être stable et rapportée par le seed.

Tranches impactées : tranche 11 pour le contrat d'import et la répartition ; tranche 12 pour la recette du catalogue réel et du verrouillage.

Tentatives effectuées : inventaire des 69 fichiers, lecture d'échantillons dans Business, Études et Manga, comparaison avec le contrat `ressources/prompts/README.md`, contrôle de l'état Git et du seed actuel. Aucun test ni code applicatif n'a été écrit.

Décision humaine du 2026-08-10 : proposition validée avec un ajustement de la répartition à 20 prompts `FREE` et 49 prompts `PREMIUM`. Répartition proportionnelle retenue par dossier : Business 9, Études 3, Manga 1, Marketing digital 1, Réseaux sociaux 2, Vie pro 4. L'écart est clos ; la pipeline reste inchangée.

### Écart clos E11-02 — purge des ressources de l'historique Git

Constat factuel : `git ls-files ressources` est vide à HEAD et les 80 fichiers locaux sont préservés, mais les 69 corps réels de `ressources/PROMPTS/` ont été introduits dès le commit initial `9362850`. Ils restent donc récupérables dans l'historique de `main` et des anciennes branches locales/distantes.

En quoi la tranche ne peut pas être validée telle quelle : la décision produit exige que `ressources/` ne soit pas versionné et ces fichiers comprennent des corps premium. Une suppression de l'index ne retire pas les blobs des commits déjà publiés.

Proposition soumise à validation humaine : réécrire l'historique de toutes les branches conservées pour supprimer `ressources/` de chaque commit, supprimer les anciennes branches distantes devenues inutiles, puis pousser de force les références nettoyées avant de reconstruire les deux PR de validation. Cette opération change les identifiants de tous les commits et oblige tout clone existant à se resynchroniser ou à être recréé.

Tranches impactées : tranche 11 et historique des tranches 00 à 10 ; aucun comportement applicatif n'est modifié.

Tentatives effectuées : vérification de HEAD, inventaire des blobs dans le commit antérieur, recherche du premier commit d'introduction et inventaire des branches qui le contiennent. Aucune réécriture ni suppression distante n'a été effectuée sans accord explicite.

Décision humaine du 2026-08-10 : purge complète autorisée, y compris réécriture de l'historique, push forcé des références conservées et suppression des anciennes branches distantes devenues inutiles.

Exécution : la purge locale est complète ; `main` a été remplacé par `11a17ae`, la branche de tranche par `18c6441`, les quatre anciennes branches distantes ont été supprimées, les références originales et reflogs locaux ont été retirés, puis le dépôt local a été compacté. Les 80 fichiers locaux sont préservés. Aucun objet Git local ni aucune branche distante ordinaire ne contient `ressources/`.

Blocage résiduel découvert par l'audit : GitHub conserve en lecture seule `refs/pull/1/head` à `refs/pull/17/head`. Les 17 arbres contiennent encore entre 77 et 92 chemins sous `ressources/`, et GitHub refuse leur suppression par push (`deny updating a hidden ref`). La purge totale exige désormais une demande au support GitHub ou le remplacement du dépôt public par un dépôt neuf. Ce niveau de destruction/coordination n'était pas inclus explicitement dans la première autorisation ; nouvel arbitrage humain requis.

Second arbitrage humain du 2026-08-10 : remplacement total du dépôt autorisé. L'ancien dépôt public a été supprimé depuis l'interface GitHub après confirmation explicite, puis `Danii15321/Synapse` a été recréé en public avec le même nom et sa description produit. Le nouveau dépôt porte l'identifiant `R_kgDOTz3Lmw` et a été créé à `2026-08-10T05:19:09Z`. Seuls `main` à `11a17ae` et `feat/tranche-11-enrichissement-ressources` à `18c6441` ont d'abord été poussés.

Clôture : l'audit indépendant confirme qu'aucun arbre ou objet Git local ou distant accessible ne contient de chemin `ressources/`. La nouvelle PR d'implémentation #1 a été fusionnée dans `main` au commit `6b859c7` après deux runs CI verts (`31359881234` pour la PR et `31359879391` pour le push). La CI post-fusion `31360143063` est également verte. Les anciennes références de PR appartenaient au dépôt supprimé et n'existent pas dans le dépôt recréé. Les 80 fichiers éditoriaux locaux, dont les 69 sources uppercase, restent préservés hors Git. L'écart est clos.

## Validation finale

Validation applicative indépendante : lint et type-check verts ; Vitest **89 fichiers / 310 tests** ; Playwright **36/36** ; build production vert ; `npm audit` sans vulnérabilité. Seed réel isolé et rejoué : 69 prompts, 20 `FREE`, 49 `PREMIUM`, zéro formation, opportunité ou jeu ; empreinte de base stable et 69/69 corps identiques aux sources. Les ressources CI synthétiques sont reproductibles, refusent l'écrasement local et ne sont pas versionnées.

Validation distante : la PR d'implémentation #1 (`https://github.com/Danii15321/Synapse/pull/1`) est fusionnée dans `main` au commit `6b859c7`. Ses runs de pull request et de push sont verts, puis le run post-fusion `31360143063` valide lint, typage, migrations, import synthétique, 310 tests Vitest, build, 36 tests E2E et audit des dépendances en 4 min 22 s. La seconde PR porte exclusivement ce journal de clôture.

Verdict final de l'audit : **conforme**. Les exigences de la tranche sont couvertes, les tests gelés sont intacts, la pipeline n'a pas été modifiée, le contenu premium n'est jamais chargé pour un utilisateur non entitled et aucun fichier `ressources/` ne subsiste dans l'historique Git du dépôt recréé.
