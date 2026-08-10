# Déploiement de la v1 sur Vercel

Ce document est le contrat d'exploitation de la recette v1. La cible applicative
est Vercel. Aucun fournisseur PostgreSQL managé n'est encore sélectionné : les
étapes ci-dessous restent donc indépendantes du fournisseur.

## Prérequis bloquants

Avant toute mise en ligne, le fournisseur PostgreSQL retenu doit fournir :

- une connexion poolée compatible avec les fonctions serverless ;
- une connexion directe réservée aux migrations et aux opérations de reprise ;
- une sauvegarde active avec une rétention connue ;
- la restauration d'une sauvegarde vers une base cible isolée ;
- des identifiants distincts et révocables, stockés uniquement dans les secrets
  Vercel ou dans le coffre du fournisseur.

La mise en ligne est interdite tant qu'un seul de ces prérequis manque. Le choix
du fournisseur appartient au porteur du projet et ne peut pas être déduit de ce
document.

## Connexions PostgreSQL et pooling serverless

Dans Vercel, `DATABASE_URL` contient l'URL du pooler fournie pour les connexions
serverless. Elle est utilisée par Prisma au runtime et ne doit jamais être
affichée dans un log. `AUTH_SECRET` et `SITE_URL` sont également définies comme
secrets de l'environnement Production.

Les migrations n'empruntent pas le pooler de transaction. Dans un environnement
d'administration éphémère, affecter temporairement la connexion directe à
`DATABASE_URL`, puis exécuter :

```bash
npm ci
npx prisma migrate deploy
npx prisma db seed
```

La connexion directe ne doit pas être enregistrée dans un fichier du dépôt ni
dans les variables de runtime Vercel. Une fois la migration terminée, le runtime
continue d'utiliser exclusivement l'URL poolée.

## Installation depuis un clone frais

Le contrôle sur machine propre suit exactement cette séquence :

```bash
git clone <depot> ssynapse
cd ssynapse
npm install
docker compose up -d postgres
cp .env.example .env
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

En CI, `npm run ci:resources` approvisionne les seules ressources synthétiques
avant le seed, car `ressources/` reste hors Git. Le clone frais local n'est
validé PASS qu'avec l'archive éditoriale privée approvisionnée selon
`docs/import-ressources.md`. L'essai isolé de recette est consigné dans la
matrice ; aucune étape cachée n'est admise.

## Sauvegarde obligatoire

La sauvegarde doit être active avant d'ouvrir le premier trafic public. La
rétention, la fréquence et l'heure du dernier point disponible sont relevées
depuis le tableau de bord du fournisseur. Une simple option affichée comme
disponible ne vaut pas activation.

Le contrôle préalable consigne sans secret :

- le fournisseur et le projet sélectionnés par le porteur ;
- l'identifiant non sensible de la base source ;
- la politique de rétention active ;
- l'heure du dernier point de sauvegarde réussi ;
- la date et l'auteur du contrôle.

## Procédure de restauration vérifiable

1. Depuis le fournisseur, restaurer le point retenu vers une **base cible
   isolée** ou une base temporaire. Ne jamais écraser la production pour un
   exercice.
2. Placer l'URL de cette cible dans `RESTORE_DATABASE_URL`, uniquement dans le
   terminal de contrôle.
3. Vérifier la migration, le volume et la répartition du catalogue :

```bash
npx prisma migrate status --schema prisma/schema.prisma
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL;'
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  'SELECT "visibility", COUNT(*) FROM "Prompt" WHERE "publishedAt" IS NOT NULL GROUP BY "visibility" ORDER BY "visibility";'
```

4. Le résultat attendu pour les prompts v1 est 20 `FREE` et 49 `PREMIUM`.
5. Exécuter une lecture applicative contre la cible isolée, sans envoyer
   d'e-mail ni modifier la production, puis supprimer la base temporaire depuis
   l'interface du fournisseur.

La restauration n'est déclarée testée et réussie qu'après consignation de la
source, de la base cible, du point restauré, des commandes, de leurs contrôles
et de la date. Les credentials externes n'étant pas fournis, cette preuve reste
à produire sur le fournisseur finalement retenu ; elle bloque la mise en ligne.
