# Journal — tranche 07 : Tranche de référence Prompts

- Démarrée le : 2026-08-08 / Terminée le : 2026-08-08 / Statut : TERMINÉE

## Definition of Ready

Tranche précédente validée : oui — la tranche 06 est terminée, auditée, fusionnée par les PR #7 et #8 ; la CI post-fusion de `main` est verte.

Écarts des journaux précédents pris en compte : E04-01 reste applicable à l'authentification par sessions PostgreSQL `database`. E06-01 reporte uniquement le contrôle réel d'un aperçu WhatsApp au premier déploiement HTTPS public ou, au plus tard, à la tranche 12. E06-02 est clos et rappelle de ne jamais remplacer le reporter Playwright configuré lors de la suite E2E officielle. Aucun autre écart ouvert n'affecte la tranche 07.

Questions « À trancher » : résolues par le porteur le 2026-08-08. Les deux premières recommandations sont acceptées et l'auteur est explicitement exclu. Les captures de référence précisent le bloc de lecture et ses actions. `docs/pipeline-dev/` est identique à `origin/main`, l'arbre initial est propre et la branche `feat/tranche-07-reference-prompts` est créée. La Definition of Ready est satisfaite.

### Relevé de décisions — transmis aux trois agents

| Question « À trancher » ou précision produit | Réponse retenue | Tranchée par |
|---|---|---|
| Liste des domaines | Enum fermé initial : `ia`, `entrepreneuriat`, `productivite`, `communication`. Un ajout futur passe par une migration explicite. | Recommandation de la tranche acceptée par le porteur le 2026-08-08 |
| Tags | Tags libres en `String[]`, normalisés à l'import en minuscules, sans accents, espaces de bord retirés, valeurs vides et doublons supprimés. | Recommandation de la tranche acceptée par le porteur le 2026-08-08 |
| Auteur affiché | Aucun champ auteur dans le modèle, le contrat de ressources, les DTO ou l'interface. | Porteur du projet le 2026-08-08 |
| Anatomie d'un prompt | Une carte et un détail présentent une image 4/3 avec fallback, un titre, une courte description (`summary`), puis le prompt lui-même dans un bloc distinct quand l'accès serveur l'autorise. | Porteur du projet, captures fournies le 2026-08-08 |
| Actions sur le corps | La tranche 07 livre Copier et un menu « Ouvrir dans ChatGPT / Claude » dans la même petite île cliente. Par sécurité, l'action copie le corps puis ouvre le nouveau chat du fournisseur avec une instruction accessible de collage ; elle ne place jamais le corps dans une URL. Les actions sont absentes si le serveur n'a pas livré le corps. | Demande du porteur, placement et garde-fou sécurité arrêtés le 2026-08-08 |
| Injection automatique par lien | Pas en v1 : Claude documente un deep link avec le prompt en paramètre `q`, alors qu'aucun mécanisme public stable équivalent n'est documenté pour ChatGPT ; mettre un corps premium dans une URL violerait en outre le contrat de confidentialité. À réévaluer en v2 avec une revue sécurité et des intents officiels stables. Ce travail n'appartient à aucune tranche 08–12 et la pipeline n'est pas modifiée. | Arbitrage de sécurité demandé au chef-projet par le porteur le 2026-08-08 |

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test ni dans le code.

## Analyse — reste ici, n'est transmise à personne

Livrable démontrable : à 390 px, un visiteur parcourt une liste finalisée, recherche et filtre par domaine/tag, pagine par curseur, ouvre le détail puis copie un prompt gratuit. Un membre premium accomplit le même parcours sur un contenu premium ; un anonyme et un membre `FREE` ne reçoivent aucun octet du corps. Une personne non développeuse peut créer un prompt gratuit ou premium en suivant `ressources/prompts/README.md`.

Périmètre : modèle Prompt complet et migration ; enum de domaines ; publication ; couverture 4/3 ; contrat Markdown/frontmatter et import strict ; deux exemples réels ; pagination curseur ; recherche `title`/`summary` ; filtres domaine/tag ; repository/service/API liste et détail ; DTO teaser/full ; métadonnées sûres ; carte de référence remplaçant la carte provisoire ; états loading/error/empty/success ; copie et ouverture sûre des deux fournisseurs ; documentation `docs/patron-rubrique.md`.

Hors périmètre : auteur ; full-text PostgreSQL ; interface d'administration ou upload ; import industrialisé de tout le contenu réel de la tranche 11 ; exécution du prompt par une API IA ; clés OpenAI/Anthropic ; injection automatique du corps dans une URL ; analytics de clic ; favoris, partage social avancé, commentaires ; rubriques 08 et 09 ; paiement de tranche 10.

DoD commune applicable : livrable navigateur 390 px ; quatre états ; non-régression 01–06 ; chaîne qualité complète ; architecture en couches ; validation Zod stricte ; vraie base pour repository ; JSON brut et HTML/RSC sans corps premium ; reproductibilité ; documentation et commits conformes.

DoD spécifique : patron de rubrique ; carte de référence ; contrat de ressources et deux exemples ; pagination sur au moins 200 lignes ; absence N+1 prouvée par les logs Prisma ; métadonnées premium sans corps ; utilisabilité à 390 px sous réseau bridé.

Pièges retenus comme cas de test : offset au lieu du curseur ; brouillon servi ; corps sélectionné pour un teaser ; corps premium dans JSON/HTML/RSC/metadata/URL ; page entière cliente pour Copier ; filtre non strict ou curseur invalide ; tags non normalisés ; Markdown avec HTML exécuté ; N+1 ; carte provisoire conservée ; image sans fallback ou dimensions ; action fournisseur disponible sans corps ; duplication lors de l'import ; état vide absent avec filtres actifs.

## Tests

Phase RED terminée et revue par le chef-projet le 2026-08-08.

- 25 scénarios gelés : 21 Vitest répartis entre repository, service, API, contrats, composants et métadonnées ; 4 parcours Playwright à 390 px.
- Preuve RED indépendante : `10` fichiers Vitest en échec, `21/21` tests rouges. Les causes observées correspondent au travail absent de la tranche : colonnes et enum Prisma manquants, catalogue et contrats éditoriaux absents, filtres non implémentés, carte encore provisoire, métadonnées/actions non livrées.
- Preuve E2E indépendante avec les reporters Playwright configurés : `4/4` parcours rouges, dès l'absence de `domain` ou `publishedAt` dans la base non migrée.
- `npm run type-check` : vert. ESLint ciblé sur les 13 fichiers : vert. `git diff --check` : vert.
- Revue avant gel : la recherche instantanée et la pagination par ajout de cartes ont été retirées des exigences, au profit d'une soumission explicite et d'une page suivante par curseur ; l'état `error` est rendu directement par le Server Component, sans imposer une frontière cliente Next.js ; le remplacement de la carte d'accueil est vérifié séparément.
- Couverture héritée de la tranche 05 conservée sans duplication : mapping teaser/full, `ContentNotFound`, `includeBody` et gating du détail sur le JSON brut.

### Gel des tests

À compter de ce relevé, les fichiers ci-dessous sont immuables pour l'agent d'implémentation et l'agent d'audit :

```text
2ee9845133c012e55a77e2af81298505c2b7714fc7e0beff84794ec327befabe  tests/api/prompt-catalog-route.test.ts
548b0ac1ad6f7c8c06af58e97c7a1a3866eb365b6766c0c995add7171fdd86e3  tests/components/prompt-list-error-state.test.tsx
6d1b3244e16ee1f0f4eabdfd995f8db2d518afe6199198eebd99703d50781e91  tests/components/prompt-metadata.test.ts
88100218cd55a19313a10734721f3ce2e9dac3a120d3b7e8eaf115b09c79952f  tests/components/prompt-reference-ui.test.tsx
82c4f966eebb999cd48c1574a6a73636eda0166fd68c9b050174597b0cf08b7a  tests/contracts/prompt-client-boundary.test.ts
3e9cf2bd6e6a5cfb996db303a41d5d176ec8c1a17192a03bab2703aa5e837a2a  tests/contracts/prompt-resources.test.ts
342ba2876ad0646090d483fbeeb789b587dcc6503590412fa545c4ed6236b8f9  tests/contracts/prompt-section-pattern.test.ts
8852a672ef78d8968173fcfda86a9f2206c78337565a59b063e15df27f0497f1  tests/e2e/prompt-reference-helpers.ts
86c53adaa1d68279742f0426324f929f5d88560a695217b84e9fc8d5715ce2c4  tests/e2e/prompt-reference.spec.ts
dbef755e067032dcaf2accc10a2001c6a736077ca16766f4d608452611096feb  tests/repositories/prompt-catalog-fixtures.ts
b1ae97b9db0858ab51091c4ae952f76a21fc0366cc2e448cbfcd7dabfa28393d  tests/repositories/prompt-catalog-model.test.ts
d538c9ddaa1c9266c1d9cc6cf766f95d1ddb573720c8cf1ce781d1474853d29a  tests/repositories/prompt-catalog-pagination.test.ts
b0952324b4be29fbe0aad043c6c8d28ec6b3926006b50ddca9888106a0e62fbd  tests/services/prompt-catalog-service.test.ts
```

### Nouveau gel après Audit-01 — contrats historiques supersédés

L'audit a prouvé que douze fichiers hérités figeaient encore trois comportements désormais contraires à la tranche 07 : détail sans `domain`/`coverImage`, publication implicite en l'absence de `publishedAt`, et réponse liste legacy non paginée. `agent-test` a corrigé uniquement ces contrats. Preuve indépendante sur le code avant correction : 40 tests ciblés, 34 verts et 6 rouges exactement sur les trois écarts ; type-check et lint verts. Les 13 empreintes initiales ci-dessus sont restées inchangées.

```text
970028d6ea71a52ce970fc0ea081d3a166868d01487cee3c1853f984d4c212fd  tests/contracts/premium-architecture.test.ts
b08ec679f7c268e5e09ba7abaf95b16eadd82b1be90b7e03d1c686e424e4ca4d  tests/repositories/premium-prompt-repository.test.ts
ceafdb2fd83bf39185efb8c73d434553b64f55a37ec29a6e639631b2bcc165e7  tests/services/premium-prompt-service.test.ts
8ee8514e12e8eb68162c2a179c358b5f2e184587b309526d6f007215b318af1c  tests/api/premium-prompt-route.test.ts
2962ad708fb92d782dc0a5fd5fb690a5b63376b4245618d615571e7605f1c4f0  tests/components/premium-prompt-page.test.tsx
a099a2e79229b9fe2af8f75173b384f03a5a0b3938235f5eab1dc98284ed4814  tests/repositories/prompt-repository.test.ts
8cf09b47159ffd519724f58f57bf29ef547f5f9d4ad2ddaa0508b8a0c897e250  tests/services/prompt-service.test.ts
2091612864bf45b4b195d557b572951f574231355c6f575586747fd235ec0d2a  tests/api/prompts-route.test.ts
5eae13294303ba2d524a4d306b24381fa3e8843414a5d690d0bcdab344966663  tests/components/prompts-page.test.tsx
dca51768f9d8e3724aea200be35686a76f20f6d47ad4371005be02d58e3b606b  tests/e2e/prompts.spec.ts
561525810cd1ec51da983bacae9b39180d1d6ef00746cfb4b228bd677f9fce18  tests/repositories/home-repository.test.ts
b7475ab85f371be5f66ea66fa41da0af3652185b8da432d05d19e3aed09ba5b0  tests/e2e/home-premium-safety.spec.ts
e6ed7b81f5bc7a60b7f4ff4af5356926b047004937fffd251919dcd73386d9fb  tests/e2e/shell-identity.spec.ts
```

## Itérations audit ↔ implémentation

| # | Constats renvoyés | Ce qui a été corrigé |
|---|---|---|
| Pré-GREEN-01 | `prompt-catalog-model.test.ts` comparait la liste complète des colonnes dans leur ordre physique PostgreSQL. La migration Prisma correcte ajoutait les trois colonnes attendues sans déplacer les colonnes historiques ; respecter le test aurait exigé une reconstruction destructive et manuelle sans sémantique produit. | Objection de l'implémentation acceptée par le chef-projet au titre de `gouvernance.md` §4. `agent-test` est rappelé pour conserver les assertions contractuelles (présence, types, nullabilité, enum, index, absence d'auteur) en supprimant uniquement la dépendance à `ordinal_position`. L'implémentation reste arrêtée jusqu'au nouveau gel. |
| Pré-GREEN-02 | Le même test exigeait la forme textuelle `("publishedAt", "domain")` dans `pg_indexes`, tandis que PostgreSQL canonise l'index réellement présent en `("publishedAt", domain)` en retirant les guillemets optionnels de l'identifiant en minuscules. | Objection acceptée : `agent-test` est rappelé pour accepter les deux représentations SQL équivalentes sans relâcher l'ordre des colonnes indexées. |
| Audit-01 | **NON CONFORME** — 5 bloquants : métadonnées de carte d'accueil forcées ; image/domaine absents du détail réel ; `publishedAt` auto-publié par défaut et contrat de brouillon incohérent ; forme legacy non paginée sur `GET /api/prompts` sans query ; filtre de tags limité à la page courante. 1 majeur : `body`, `excerpt` et `coverImage` insuffisamment bornés/validés à la frontière de ressources. Les 174 tests, 21 E2E, lint, type-check, build et audit de dépendances étaient néanmoins verts. | Trois contrats de tests historiques contredisent la tranche 07 : détail sans nouveaux champs, création omettant `publishedAt` considérée publiée et réponse liste legacy. Arbitrage chef-projet : `agent-test` est rappelé pour remettre uniquement ces scénarios supersédés en cohérence avec la tranche brute ; l'implémentation est arrêtée jusqu'au nouveau gel. Les autres constats repartiront ensuite à l'agent d'implémentation. |
| Pré-GREEN-03 | Après le gel post-audit, `home-repository.test.ts` conservait un attendu exact limité aux quatre champs historiques de `recentPrompts`, alors que le même audit impose de transporter les vraies métadonnées publiques de `PromptCard`. | Objection acceptée : `agent-test` est rappelé pour achever la mise en cohérence de ce seul snapshot avec `coverImage`, `domain`, `tags` et `visibility`, sans API parallèle ni contournement. |
| Pré-GREEN-04 | `shell-identity.spec.ts` interdisait le texte « Premium » sur toute la page d'accueil pour une session `FREE`. Après restitution des vraies métadonnées, cette assertion confond le badge public d'un contenu premium avec le statut d'adhésion de l'utilisateur. | Objection acceptée : `agent-test` est rappelé pour limiter l'assertion au shell et à l'identité du membre, sans interdire les badges éditoriaux dans `main`. |
| Audit-02 | **CONFORME POUR VALIDATION** — les six constats Audit-01 sont clos avec preuves HTTP, DB et navigateur. Les 174 tests, 21 E2E, lint, type-check, build, migrations et audit de dépendances sont verts ; 26 empreintes conformes. Un seul constat mineur : commentaire de `prompt-service.ts` encore rédigé selon le mode legacy supprimé. | Renvoyé à l'implémentation pour actualiser uniquement le commentaire, puis restaurer `next-env.d.ts` régénéré automatiquement par le build d'audit. |

## Décisions d'implémentation

- Le catalogue public utilise une forme unique `{ items, nextCursor }`, y compris sans query string ; `take` vaut 24 par défaut et la compatibilité legacy non paginée a été retirée.
- La pagination est stable sur `publishedAt desc, id desc`. Le repository demande `take + 1` via le service et ne sélectionne jamais `body` pour une carte.
- `publishedAt` n'a aucun défaut : absent ou `null` signifie brouillon. La migration initiale étant déjà appliquée, une seconde migration générée et versionnée retire uniquement le défaut SQL, sans réécrire l'historique.
- Le détail transporte `domain` et `coverImage` dans les DTO teaser/full. `coverImage` est nullable et déclenche alors le fallback 4/3 ; `domain` reste obligatoire.
- Les tags de filtre sont chargés indépendamment de la page courante par une requête SQL taguée `DISTINCT unnest(tags)`, filtrée sur les contenus publiés, triée et bornée à 500. La page charge catalogue et tags en parallèle.
- La frontière éditoriale accepte `publishedAt` absent/null pour un brouillon ; elle borne `body` à 50 000 caractères, `excerpt` à 1 200, `coverImage` à 255, les tags à 20 × 80 et limite les images aux chemins locaux `/images/prompts/` en AVIF/JPEG/PNG/WebP.
- L'accueil réutilise `PromptCard` avec les métadonnées réelles du repository ; aucune visibilité, aucun domaine, tag ou chemin d'image n'est inventé dans la page.
- `PromptActions` est l'île cliente des actions de détail : copie exacte du corps, puis ouverture des URLs fixes ChatGPT/Claude avec `noopener,noreferrer`. Le corps n'entre jamais dans l'URL, les attributs, les logs ou les requêtes sortantes.

## Écarts

Aucun écart ouvert. Les quatre contestations de tests ont été arbitrées dans la tranche et consignées dans les itérations ; elles n'ont exigé ni modification de pipeline ni validation humaine d'un écart.

## Validation finale

Validation indépendante du chef-projet le 2026-08-08 :

- `npm run lint` : vert, zéro avertissement.
- `npm run type-check` : vert.
- `npm run test` : 51 fichiers, **174/174** tests verts.
- `npm run build` : vert, 24/24 pages générées.
- `npm run e2e` avec les reporters configurés : **21/21** parcours verts, dont 4/4 tranche 07 à 390 px et réseau 3G bridé.
- `npm audit --audit-level=high` : zéro vulnérabilité.
- `npx prisma migrate status` : 8 migrations, schéma à jour.
- 26/26 empreintes gelées vérifiées par `sha256sum -c`.
- Migration initiale : `1abc35ef5ec49d4a8b7b3745c6e2e86fca9921c64b37fbb38d1d80c017439aeb` ; migration corrective : `0468f27c159bec82d43ae1d0771c36cfa63caed79d1c392eb9e0738b1b5a14d0`.
- `git diff --check` : vert ; `docs/pipeline-dev/` : aucun diff ; `next-env.d.ts` : restauré, aucun diff.
- Audit final : **CONFORME — aucun constat résiduel**.
