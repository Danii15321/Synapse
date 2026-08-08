# Patron de création d'une rubrique

Ce guide fixe l'enchaînement à reproduire pour une nouvelle famille de contenu.
Chaque étape se termine par une preuve ciblée avant de passer à la suivante.

1. **Validator** — définir les schémas Zod stricts des ressources, paramètres,
   filtres et DTO. Les types sont dérivés des schémas.
2. **Repository** — écrire les lectures Prisma avec `select` explicite,
   publication filtrée en base et pagination par curseur bornée.
3. **Service** — mapper les rows vers les DTO publics, appliquer les règles
   métier et demander la décision d'accès centralisée.
4. **Route Handler (`app/api`)** — valider les entrées, lire la session quand
   nécessaire, appeler le service et traduire les erreurs domaine en HTTP.
5. **`lib/api.ts`** — ajouter l'unique fonction HTTP destinée au navigateur et
   valider sa réponse.
6. **Hook** — créer un hook TanStack Query seulement lorsqu'une interaction
   cliente a réellement besoin de données distantes.
7. **Composants** — construire la carte de référence, le verrou visuel et les
   éventuelles petites îles interactives.
8. **Pages** — assembler liste et détail en Server Components, avec métadonnées
   publiques sûres et navigation mobile-first.

## États et preuves obligatoires

Chaque écran traite explicitement `loading`, `error`, `empty` et `success`.
La validation comprend les quatre niveaux : test du repository sur PostgreSQL,
test unitaire du service, intégration API et parcours E2E à 390 px.

Pour un contenu gated, le repository décide son `select` avant la lecture :
`body` n'est chargé que si le service a reçu une autorisation positive du point
central d'entitlement. Un anonyme et un membre `FREE` ne reçoivent jamais ce
champ. La preuve porte sur le JSON brut de la réponse, puis sur HTML/RSC et les
métadonnées lorsque la page les sérialise. Un cadenas ou un flou reste purement
visuel et ne constitue jamais une protection.

Avant d'implémenter une nouvelle rubrique, tous les champs verrouillés sont
recensés explicitement. Ils suivent ensemble la même décision d'accès et le
même `select` conditionnel. Pour une opportunité, `externalUrl` est verrouillé
avec `body` : aucun des deux champs n'est lu pour une personne non entitled.

La liste ne sélectionne que les champs de carte, exclut les brouillons, combine
les filtres dans une seule requête et expose un curseur opaque. Le détail garde
le corps hors des URL, journaux et métadonnées de partage.

Les règles de péremption et d'expiration appartiennent au repository, jamais à
la vue. Une opportunité après sa `deadline` n'est plus accessible et n'a pas
d'archive v1. Une formation `EVENEMENTIELLE` après `startsAt` expire également,
tandis qu'une formation `PERMANENTE` reste consultable sans date ni inscription.
Cette nature reste indépendante de la visibilité `FREE` ou `PREMIUM`.
