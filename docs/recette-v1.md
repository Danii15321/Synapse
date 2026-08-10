# Matrice de recette v1

Cette matrice distingue les preuves automatisées des validations physiques ou
d'exploitation. Elle ne transforme jamais une émulation en preuve externe.

## Parcours bloquants en CI

Les trois parcours Playwright à 390 px sont des preuves bloquantes de la CI :

- parcours visiteur anonyme : accueil, quatre rubriques, libre, verrous,
  premium et inscription ;
- parcours membre FREE : connexion, libre, quatre verrous, concours gratuit et
  compte ;
- parcours membre PREMIUM : quatre contenus complets, lien externe, concours
  premium et compte.

Résultats automatisés : parcours visiteur anonyme réussi ; parcours membre FREE
réussi ; parcours membre PREMIUM réussi. Ces mentions décrivent les scénarios
Playwright et ne remplacent pas le contrôle sur téléphone physique.

Une CI verte ou réussie exige ces trois parcours, le lint, le type-check, les
tests, le build et les E2E sans tolérance d'échec. La non-régression est validée
sur le viewport 390 px et couvre les états loading, error, empty et success.

## Tableau d'audit d'entitlement

Chaque cellule ci-dessous est vérifiée par le test de service, la réponse JSON
brut du Route Handler, le HTML servi et le payload RSC. L'acteur anonyme et le
membre FREE reçoivent le teaser, jamais la valeur verrouillée.

| Rubrique         | Champs                | Acteurs                       | Preuves de transport                                                              |
| ---------------- | --------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| Prompts          | `body`                | visiteur anonyme, membre FREE | service : body absent et non chargé ; JSON brut, HTML servi, RSC                  |
| Formations       | `body`                | visiteur anonyme, membre FREE | service : body absent et non chargé ; JSON brut, HTML servi, RSC                  |
| Jeux et concours | `body`                | visiteur anonyme, membre FREE | service : body absent et non chargé ; JSON brut, HTML servi, RSC                  |
| Opportunités     | `body`, `externalUrl` | visiteur anonyme, membre FREE | service : body et externalUrl absents et non chargés ; JSON brut, HTML servi, RSC |

Le scénario `tests/e2e/recette-v1-security.spec.ts` matérialise les 24 contrôles
validés : quatre rubriques, deux acteurs et trois transports. Les repositories
conditionnent leur `select` avant la lecture des champs protégés.

Preuve API complémentaire : `opportunites` — visiteur anonyme, membre FREE —
JSON brut sans `body` ni `externalUrl`.

## Base et requêtes

Le test repository s'exécute sur PostgreSQL 16 au volume réel : 69 prompts
publiés, dont 20 FREE et 49 PREMIUM. Les logs Prisma correspondent à quatre requêtes bornées, une par rubrique, sans N+1 ; aucun `body` de liste ni
`externalUrl` d'opportunité n'est chargé.

## Sécurité automatisable

- `npm audit` exécuté le 2026-08-10 : 0 high et 0 critical sur 681 dépendances.
- Rate limiting : auth et inscriptions utilisent le quota sensible de 10
  requêtes par minute ; la onzième réponse vaut 429 avec `Retry-After`.
- Historique Git inspecté le 2026-08-10 : aucun secret ni fichier `.env` réel ;
  seul `.env.example` est présent.
- Recherche applicative : `grantPremium` n'a aucune voie publique et n'est
  appelé que par le script d'administration `scripts/grant-premium.ts`.
- Audit Git : `ressources/` est absent de tout l'historique Git.
- `ressources/` — historique Git : absent.
- Headers : le scénario sécurité vérifie une page publique et une page protégée,
  avec CSP sans `unsafe-inline`, HSTS, anti-frame, nosniff, referrer et
  permissions.
- La revue de sécurité outillée n'est dite passée ou réussie sans aucun bloquant
  qu'après le rapport de l'agent d'audit ; elle reste une porte de sortie.

## Cohérence du site

- `robots.txt` répond 200 et référence le sitemap.
- `sitemap.xml` répond 200 ; `member` et `compte` sont exclus ou absents.
- Le sitemap exclut tout brouillon et toute opportunité périmée, donc absente.
- Un slug inexistant répond 404 et pas 500.
- Les quatre rubriques gardent les mêmes états, messages et verrouillage.
- L'état vide utile est : « aucun résultat pour ce filtre ».
- Les cinq pages institutionnelles utilisent uniquement les faits publiés dans
  le README et le comportement réel de la v1. Aucun canal public n'est inventé.

## Performance et accessibilité mobile

Le protocole automatisé applique un bridage 3G lent à 400 kbit/s avec 2 000 ms
de latence. La campagne de mesure doit consigner la liste en 1 ms ou davantage,
le détail en 1 ms ou davantage et un poids transféré supérieur à 0 octet ; les
valeurs exactes varient selon le runner et sont assertées pendant le test.

Au volume réel, l'audit N+1 conclut à 0 requête supplémentaire par carte. Les
pages dépendant de la session portent `private` ou `no-store` : le cache
authentifié est désactivé. La navigation clavier, les labels associés, le
contraste AA, les cibles de 44 px, la structure de titres et les textes alternatifs sont des contrôles bloquants des listes et formulaires à 390 px.

## Vérifications du premier HTTPS public

Ces preuves ne peuvent pas être produites dans le dépôt. Elles sont
explicitement non réalisées et interdisent de déclarer la mise en ligne :

### Téléphone réel

- Date : non réalisée, à renseigner lors du premier déploiement HTTPS public.
- Appareil : téléphone physique, modèle à consigner.
- Navigateur : nom et version à consigner.
- Cibles tactiles : confirmer le résultat 44 px sur les listes denses.
- Lisibilité et contraste : vérifier notamment en plein soleil.
- Clavier : vérifier qu'il ne masque aucun champ de formulaire.

Un viewport DevTools ne remplace pas ce contrôle sur téléphone réel.

### Partage dans un vrai fil WhatsApp

- Date : non réalisée, à renseigner.
- Téléphone : modèle physique à consigner.
- Fil WhatsApp réel : destinataire de test autorisé à consigner sans donnée
  personnelle dans le dépôt.
- Prompts → Formations → Jeux et concours → Opportunités : contrôler les quatre
  aperçus.
- Aperçu premium : confirmer qu'il s'affiche sans aucun corps ou `body`.

Le premier déploiement HTTPS public et les credentials externes sont requis ;
aucun test local n'est présenté comme cette preuve.

## Exploitation et reproductibilité

La cible est Vercel. `DATABASE_URL` utilise le pooling serverless au runtime ;
la connexion directe n'est utilisée que pour `prisma migrate deploy`. Le clone
frais est validé PASS uniquement après `git clone`, `npm install`,
`prisma migrate deploy`, `prisma db seed` et démarrage sur machine propre avec
les ressources privées approvisionnées.

La sauvegarde active est un prérequis bloquant. La procédure et les commandes
de restauration vers une base cible en environnement isolé sont dans
`docs/deploiement-v1.md`. La restauration sera vérifiée, testée et réussie
uniquement après sélection du fournisseur et activation réelle ; cette preuve
externe reste incomplète.

## Hors-v1 communiqué et assumé

Restent hors v1 : paiement réel, e-mails, interface d'administration,
déroulement des jeux sur la plateforme, recherche avancée, archive des
opportunités expirées, fournisseurs OAuth, suppression de compte et export en
libre-service, upload, thème sombre, PWA et formulaire de contact.

L'administration vient en premier comme prochaine étape. Le paiement réel reste
ultérieur, en v2. Le dashboard est hors v1. Les inscriptions comprennent les
formations événementielles : inscriptions comprises. Le catalogue reste à 69 prompts, 20 FREE et 49
PREMIUM, et `ressources/` demeure absent de l'historique Git.

## Correctifs de recette et sortie

- Pages institutionnelles, test de non-régression — fichier: tests/components/home-institutional-pages.test.tsx.
- Entitlement complet, test de non-régression — fichier: tests/e2e/recette-v1-security.spec.ts.
- Contrat de mise en ligne, test de non-régression — fichier: tests/contracts/recette-v1-readiness.test.ts.

Une DoD complète, à 100 %, avec toutes les cases satisfaites, est obligatoire
avant de prononcer la v1. Les preuves externes identifiées ci-dessus n'étant pas
encore produites, la v1 ne doit pas être déclarée mise en ligne sur la seule base
des tests automatisés.
