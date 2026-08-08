# Journal — tranche 06 : Shell du site et identité

- Démarrée le : 2026-08-08 / Terminée le : 2026-08-08 / Statut : TERMINÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 05 est terminée, auditée, fusionnée sur `main` par la PR #6 et sa CI post-fusion est verte.

Écarts des journaux précédents pris en compte : tous les écarts des tranches 01 à 05 sont clos. La dérogation E04-01 reste applicable : Auth.js conserve les sessions PostgreSQL `database` et le contrat `SessionUser`, sans JWT. Le porteur a validé le 2026-08-08 le report du contrôle dans un vrai fil WhatsApp jusqu'au premier déploiement public ; cet écart est détaillé plus bas et n'autorise aucun affaiblissement des tests techniques des métadonnées Open Graph.

Questions « À trancher » : toutes résolues le 2026-08-08. `docs/pipeline-dev/` est identique à `origin/main`. Le seul état initial non versionné est `ressources/charte-graphique/`, fourni explicitement par le porteur pour cette tranche. La branche `feat/tranche-06-shell-identite` est créée. La Definition of Ready est satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|
| Charte graphique existante | Appliquer `ressources/charte-graphique/identite_visuelle_synapse.md` : fond crème, bleu nuit dominant, gradient orange–magenta–indigo parcimonieux, Montserrat pour les titres et Inter pour le texte. Conserver `logo.png` intact ; dériver le pictogramme pour les icônes et composer le header avec ce pictogramme et le mot « Synapse » en Montserrat bleu nuit, afin de ne pas afficher le PNG vertical à fond noir sur le shell clair. | Porteur du projet, validation explicite du 2026-08-08 |
| Textes institutionnels et légaux | Rédiger « À propos » à partir du README : mission d'accompagnement et de formation des jeunes ivoiriens, trois thématiques historiques, plateforme centrée sur l'IA et l'entrepreneuriat. Contact : gabarit sans formulaire, avec emplacements explicites pour e-mail, WhatsApp et réseaux non fournis. Mentions légales, confidentialité et conditions d'utilisation : gabarits structurés, chaque fait juridique inconnu marqué « À compléter et faire valider » ; aucune identité, durée, base légale ou obligation n'est inventée. | Proposition du chef-projet validée par le porteur le 2026-08-08 |
| Ratio des visuels de carte | Ratio unique 4/3, plus présent sur mobile, pour les cartes provisoires et tous les visuels de repli préparant les rubriques suivantes. | Porteur du projet le 2026-08-08 |
| Nom de domaine et `metadataBase` | Aucun achat de domaine maintenant. Utiliser une variable serveur `SITE_URL`, sans préfixe `NEXT_PUBLIC_`, validée comme URL absolue ; valeur factice `http://localhost:3000` documentée et utilisée en local/CI, puis remplacée par l'origine HTTPS réelle au déploiement sans changement de code. `metadataBase` est construit depuis cette valeur. Le test manuel dans WhatsApp est reporté au premier déploiement public, mais les URL absolues, métadonnées et images Open Graph restent entièrement testées dans cette tranche. | Proposition du chef-projet et écart explicitement validés par le porteur le 2026-08-08 |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : à 390 px, un visiteur comprend la proposition de Synapse depuis l'accueil, ouvre un menu accessible, rejoint les quatre rubriques et les cinq pages institutionnelles, puis observe une navigation qui reflète correctement sa session et son adhésion. Les métadonnées de partage produisent des URL absolues et une image Open Graph cohérente avec la marque.

Périmètre : mise en œuvre des tokens de marque ; composants UI et badge premium uniques ; layout racine serveur, header, menu mobile client isolé, indicateur de session client isolé, footer ; accueil de conviction avec compteurs réels et carte récente provisoire ; convention média 4/3 et visuels de repli ; pages À propos, Contact, Mentions légales, Confidentialité et Conditions d'utilisation ; `SITE_URL`, metadata, robots, sitemap, favicon, icônes, manifest et image Open Graph ; habillage des erreurs ; reprise visuelle des écrans des tranches 02 à 05.

Hors périmètre : contenu définitif des rubriques 07 à 09 ; recherche globale ; thème sombre ; PWA installable ; animations élaborées ; formulaire ou service d'envoi de contact ; paiement réel ou tunnel de tranche 10 ; carte de contenu définitive de tranche 07 ; invention de données juridiques ou de coordonnées.

DoD commune applicable : TDD et quatre niveaux de tests ; lint, types, tests, build et audit npm verts ; états explicites sur chaque écran touché ; architecture en couches ; Zod aux frontières ; Server Components par défaut ; accessibilité clavier et mobile 390 px ; non-régression des tranches 02 à 05 ; aucune modification de la pipeline.

DoD spécifique : aucun token visuel en dur dans un composant ; menu mobile au clavier avec Échap et focus piégé ; focus visible et contraste AA ; compteurs issus de PostgreSQL ; robots et sitemap sans page protégée ni brouillon ; métadonnées de partage absolues avec image ; cinq pages institutionnelles au footer ; reprise de tous les écrans existants ; repli 4/3 pour contenu sans image.

Pièges retenus comme cas de test : couleur en dur ; layout racine rendu client ; menu inaccessible ; sitemap contenant `(member)` ou un brouillon ; texte juridique inventé ; compteur constant ; carte définitive prématurée ; absence d'image Open Graph ; image sans dimensions ; fuite de contenu premium lors de la reprise visuelle ; `metadataBase` local codé directement dans le composant.

## Tests

Le corpus RED comporte 38 scénarios nouveaux : 32 scénarios Vitest répartis sur huit fichiers et 6 scénarios Playwright répartis sur deux fichiers. La preuve RED exécutée par le chef-projet est nette : `32 failed | 121 passed` sous Vitest — tous les tests hérités restent verts — puis `6 failed` sous Playwright, chacun pour une capacité absente de la tranche 06 (`/api/home`, shell mobile, session, métadonnées ou visuel de repli). `npm run lint` et `npm run type-check` restent verts avant implémentation.

La relecture métier et sécurité préalable au gel a demandé deux corrections au même agent de test : renforcer le contrat contre les classes visuelles Tailwind codées en dur, puis prouver sur le JSON HTTP brut et le HTML/RSC qu'un visiteur anonyme ou `FREE` ne reçoit jamais le champ `body` ni la sentinelle du corps premium. Ces corrections ont été faites avant le gel ; aucun test n'a été modifié après celui-ci.

Couverture gelée :

- configuration serveur `SITE_URL`, validation Zod d'une URL absolue et échec immédiat en cas d'absence ;
- tokens exacts de la charte, Montserrat/Inter, gradient parcimonieux, logo source inchangé, pictogramme et déclinaisons d'icônes ;
- layout racine serveur, seules interactions du menu mobile et de l'indicateur de session isolées côté client, badge premium unique, composants UI et états interactifs ;
- dépôt PostgreSQL réel pour les compteurs et la sélection récente, service et DTO d'accueil, état vide, route `/api/home` et erreur générique ;
- `robots.txt`, `sitemap.xml`, manifest, métadonnées Open Graph absolues, quatre visuels de repli modernes au ratio 4/3 ;
- menu clavier avec piège de focus, Échap et clic extérieur, sessions `FREE`/`PREMIUM`, footer et cinq pages institutionnelles/légales ;
- accueil dans ses états succès, vide, chargement et erreur, page 404, mobile 390 px, contraste, focus et présence des visuels ;
- sécurité premium : le teaser reste visible, mais le corps et même la clé `body` sont absents des réponses brutes et du payload RSC pour l'anonyme et le membre `FREE`.

Empreintes SHA-256 au gel du 2026-08-08 :

| Fichier gelé | SHA-256 |
|---|---|
| `tests/server/site-url-config.test.ts` | `1acc02a41180f45f39c3a92e80d1e1a6642c72562764ef5b9f395df011b7426b` |
| `tests/contracts/shell-identity.test.ts` | `edea855739c3429520397444fe3b44b31814b76a06fcbcb2f6ecb0997582f469` |
| `tests/repositories/home-repository.test.ts` | `4a4d199b1e7e3fea7b2fbb55760f836d5783274fdf60d2b331cdd3b982e07592` |
| `tests/services/home-service.test.ts` | `c26f999628267e73aeb65ebc854e314d46f0ee57b2fd6ea48aa6b43643ca28f7` |
| `tests/api/home-route.test.ts` | `b4dd6026e9bb9bb305b455fcb5bedb78cb7d5a5b4e11bcdde43a5b460f388d95` |
| `tests/api/seo-routes.test.ts` | `a93cc2fcad15018d79881a96f9a93300ac8f5e9fad7e668b0d90b9f66cddd40c` |
| `tests/components/shell-navigation.test.tsx` | `94bd48e72841eb74ef5cef61c1e94c24206551734853522e8f7100dc7bd254a6` |
| `tests/components/home-institutional-pages.test.tsx` | `3fc74e5d3171dbefde5ec7934204e1af628a1da3c83ee7545df92e2d1162fa13` |
| `tests/e2e/shell-identity.spec.ts` | `1e8abac2abbda5ba605a0316b4ca215f2b5cc69e5a15b7b522f23137292d6c84` |
| `tests/e2e/home-premium-safety.spec.ts` | `da10d412f265ca7d01cdb74fa694740c1a29b11d2dd5838efb5167e5b8ec13ff` |

Correction cérémoniale après gel : l'audit a prouvé que `tests/repositories/home-repository.test.ts` supprimait les prompts existants et laissait ses quatre fixtures en base, faisant échouer ensuite la non-régression E2E historique. Ce comportement contredisait la DoD commune et l'invariant de CI. Le chef-projet a rappelé la même agente de tests, seule autorisée à intervenir : elle a ajouté un snapshot Prisma explicitement sélectionné et une restauration transactionnelle `beforeEach`/`afterEach`, sans changer aucun scénario, nom, fixture ni assertion. Le test seul passe `2/2`, Vitest passe `153/153`, puis la commande E2E officielle passe `17/17` avec les deux prompts seedés restaurés. Le fichier est regelé le 2026-08-08 avec la nouvelle empreinte `09154e652956ab06df7184ef71428c944af2854026d78259293e311226902a9b` ; les neuf autres empreintes restent inchangées.

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| 1 | Pollution PostgreSQL du test repository ; Montserrat/Inter déclarées mais non chargées ; styles inline et valeurs visuelles codées en dur dans l'image Open Graph ; liens textuels mesurés à 19 px ; `site.css` à 572 lignes ; réécriture mécanique de `next-env.d.ts`. | L'agente de tests a ajouté la restauration transactionnelle sans changer les assertions. L'implémentation a auto-hébergé les WOFF2 variables Inter/Montserrat, remplacé l'OG dynamique par un WebP statique 1200×630 servi par la convention Next, porté les liens à 44 px et scindé le CSS en quatre fichiers sous 300 lignes. `next-env.d.ts` restauré après build. |
| 2 | Les cinq constats techniques sont clos ; restent un fichier racine vide nommé `300` et la nouvelle réécriture mécanique de `next-env.d.ts` provoquée par le build de l'auditeur. | Suppression ciblée du fichier vide après vérification de son chemin/type/taille ; restauration de `next-env.d.ts`, sans relancer le build. |
| 3 | Aucun constat ouvert. | Aucune correction supplémentaire. Audit final : CONFORME. |

## Décisions d'implémentation

- Le logo source reste dans `ressources/charte-graphique/` et conserve son empreinte ; un pictogramme détouré et des actifs web dérivés sont servis depuis `public/`.
- Les quatre visuels de repli sont des bitmaps légers au ratio 4/3, générés dans l'esprit chromatique de la marque et sans texte incorporé.
- L'accueil agrège les compteurs et contenus récents par le chemin repository → service → route ; les sélections Prisma restent explicites et le corps premium n'est jamais sélectionné pour les cartes teaser.
- Le layout racine reste serveur. Les seules îles clientes du shell sont le menu mobile et l'indicateur de session.
- Le contenu différé de l'accueil est placé derrière `Suspense`, avec un titre et une structure sémantique disponibles immédiatement.
- Les images de contenu passent par un composant compatible avec la CSP stricte afin d'éviter le style inline généré par les dimensions de rendu.
- Inter et Montserrat sont auto-hébergées en WOFF2 variables via Fontsource ; seules les faces latines utiles sont demandées par l'accueil et aucune connexion externe n'est nécessaire au runtime.
- L'image Open Graph est un WebP statique 1200×630 de 22 706 octets. `opengraph-image.tsx` sert directement ce binaire local, sans `ImageResponse`, JSX de présentation ou style inline.
- Les styles du shell sont répartis entre `shell.css`, `content.css`, `details.css` et `responsive.css`, tous sous 300 lignes.
- Les gabarits juridiques emploient systématiquement la mention exacte « À compléter et faire valider » pour chaque fait non fourni.
- Après implémentation, les dix empreintes des tests gelés sont identiques au relevé RED et `docs/pipeline-dev/` reste inchangé.

Preuves finales après audit : Vitest `153/153`, E2E officiel `17/17`, build, lint, type-check, `npm audit` et `git diff --check` verts. Chromium 390 px confirme les deux familles chargées, les cibles concernées à 44 px, le fallback 4/3, le focus visible et l'absence de débordement.

## Écarts

### Écart validé E06-01 — contrôle sur un vrai fil WhatsApp reporté

Constat factuel : la DoD spécifique demande de tester l'aperçu sur un vrai fil WhatsApp, mais le projet ne dispose encore ni d'un nom de domaine ni d'une URL HTTPS publique et persistante. Un scraper WhatsApp ne peut pas atteindre `localhost`.

En quoi la tranche est infaisable littéralement dans l'environnement actuel : les métadonnées et l'image peuvent être générées et testées, mais leur consommation par WhatsApp nécessite une origine publique. Exposer temporairement la base et l'application locale ou ajouter un hébergement non prévu élargirait matériellement le périmètre et la surface de sécurité.

Proposition : valider dans cette tranche les balises servies, les URL absolues, `robots.txt`, `sitemap.xml`, l'image Open Graph et le parcours de partage ; reporter uniquement la vérification visuelle dans un vrai fil WhatsApp au premier déploiement HTTPS public.

Tranche suivante impactée : aucune pour l'architecture. La recette finale de la tranche 12 devra inclure ce contrôle avant mise en production si aucun déploiement public n'a eu lieu auparavant.

Décision humaine du 2026-08-08 : proposition explicitement validée. L'écart est autorisé sans modification de `docs/pipeline-dev/`.

### Écart validé et clos E06-02 — isolation du rate limiting dans la suite E2E

Constat factuel : les tests E2E utilisent tous la même identité réseau locale fermée, conformément à la décision de sécurité de la tranche 03. La suite cumulée déclenche onze callbacks d'authentification en moins d'une minute alors que la limite contractuelle est de dix requêtes sensibles par minute et par IP. La base confirme le bucket `sensitive:auth-callback:ip:untrusted-client` à `11` ; le onzième appel est donc correctement refusé.

Trois tentatives ont reproduit le même obstacle : suite complète `12/17`, puis `15/17` après correction de deux vraies régressions de la tranche 06, puis sous-ensemble ordonné `7/8`. Le fichier premium concerné passe `3/3` isolément sur un compteur frais, et les six E2E propres à la tranche 06 passent ensemble.

En quoi le plan est infaisable littéralement sans arbitrage : conserver simultanément une suite monolithique entièrement verte, une IP sentinelle locale unique, des tests gelés qui créent plusieurs sessions et une limite de dix callbacks par minute exige une isolation explicite de l'état `RateLimit` dans le harness E2E. Affaiblir ou segmenter artificiellement la limite dans le code de production est exclu.

Proposition : autoriser une isolation du compteur PostgreSQL entre fichiers E2E dans le seul harness de test, sans modifier les dix fichiers gelés, sans introduire de route de nettoyage dans l'application et sans changer le quota de production. L'implémentation exacte devra rester inaccessible au runtime de production et sera auditée.

Décision humaine du 2026-08-08 : proposition explicitement validée. Le correctif doit être produit par un nouvel agent d'implémentation, conformément à la gouvernance après validation d'un écart. Aucun fichier de test gelé, quota de production ou route applicative de nettoyage ne peut être modifié.

Résolution du 2026-08-08 : aucun correctif supplémentaire n'était nécessaire. Le harness autorisé existait déjà dans `HEAD` depuis les fondations de sécurité : `playwright.config.ts` impose une exécution séquentielle et charge `scripts/playwright-rate-limit-reporter.ts`, lequel vérifie strictement la cible PostgreSQL locale puis supprime uniquement les rows `RateLimit` dans `onTestEnd`. Les commandes de diagnostic précédentes avaient forcé `--reporter=dot`, ce qui remplaçait la liste des reporters configurés et désactivait involontairement cette isolation. La commande officielle, sans substitution de reporter, passe deux fois immédiatement : `17 passed (41.1s)`, puis `17 passed (39.4s)` ; le ciblage tranche 06 repasse `6/6`. L'écart est clos, sans modification de code, de test, de quota ou de pipeline et sans impact sur une tranche future.

## Validation finale

Recette technique du chef-projet le 2026-08-08 :

- `npm run lint` : vert ;
- `npm run type-check` : vert ;
- `npm run test` : 41 fichiers, `153/153` scénarios verts ;
- `npm run build` : vert, 24 pages générées ;
- `npm run e2e` officiel : `17/17` verts ;
- `npm audit` : zéro vulnérabilité ;
- dix empreintes gelées conformes, dont repository regelé `09154e652956ab06df7184ef71428c944af2854026d78259293e311226902a9b` ;
- aucun diff dans `docs/pipeline-dev/` ni `next-env.d.ts`, `git diff --check` vert ;
- audit : CONFORME après trois passes et deux retours vers l'implémentation ; aucun constat bloquant, majeur ou mineur ouvert.

DoD commune : satisfaite. Les quatre états sont présents sur l'accueil et les écrans repris ; les parcours des tranches 02 à 05 passent ; les couches, frontières serveur, sélections Prisma, validation et contraintes de sécurité sont respectées. Les réponses HTTP et HTML/RSC anonymes et `FREE` ne contiennent ni clé `body` ni corps premium.

DoD spécifique : satisfaite sous réserve du seul écart E06-01 déjà validé. Le shell mobile, le menu clavier, le focus, les cibles tactiles, les compteurs PostgreSQL, le ratio 4/3, les cinq pages institutionnelles, robots, sitemap, manifest, polices auto-hébergées et métadonnées absolues avec image Open Graph ont tous une preuve automatisée et une mesure Chromium à 390 px. La vérification dans un vrai fil WhatsApp reste reportée au premier déploiement HTTPS public et devra être reprise en tranche 12 si elle n'a pas eu lieu avant.

Tentative de recette supplémentaire dans le navigateur intégré : l'onglet `http://localhost:3000/` était présent, mais la politique de sécurité de cette surface a refusé l'accès à `localhost`. Aucun contournement n'a été tenté. Le viewport a été restauré et l'onglet conservé. La recette visuelle repose donc sur le Chromium Playwright officiel déjà exécuté, qui couvre explicitement le parcours 390 px et les mesures visuelles attendues.

Validation GitHub et clôture : les trois commits conventionnels de tests, d'implémentation et de journal ont été poussés sur `feat/tranche-06-shell-identite`. La PR [#7](https://github.com/Danii15321/Synapse/pull/7) a obtenu ses deux contrôles `quality` verts, puis a été fusionnée dans `main` au commit `5f79a8298d69f387995700f8162e3dfbc61f7168`. La CI post-fusion [31259309458](https://github.com/Danii15321/Synapse/actions/runs/31259309458) est verte (`quality` en 3 min). L'annotation GitHub sur la migration future des actions v4 de Node 20 vers Node 24 est non bloquante et ne change aucun résultat. La tranche 06 est terminée.
