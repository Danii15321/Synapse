# Synapse — Plateforme de contenu

Plateforme web qui centralise le contenu utile de **Synapse** : prompts, formations, jeux & concours, bons plans et opportunités.

---

## 1. Qu'est-ce que Synapse ?

Synapse est une entreprise qui œuvre dans **l'accompagnement et la formation des jeunes ivoiriens** autour de trois thématiques centrales :

- Orientation académique
- Intelligence artificielle
- Entrepreneuriat

La plateforme décrite ici est **volontairement centrée sur l'IA et l'entrepreneuriat**. L'orientation académique est traitée par d'autres canaux, jugés plus efficaces pour ce sujet, et sort donc du périmètre de ce projet.

---

## 2. Objectif du produit

Offrir un point d'entrée unique où la communauté Synapse retrouve, au même endroit, tout le contenu à valeur ajoutée produit par l'entreprise — aujourd'hui dispersé entre plusieurs canaux.

**Ce que la plateforme est :** une vitrine + une bibliothèque de contenu + un point d'inscription.
**Ce que la plateforme n'est pas :** un réseau social, un outil collaboratif, ni un espace où se déroulent les jeux et concours eux-mêmes.

---

## 3. Les rubriques

### 3.1 Prompts

Bibliothèque de prompts utiles et sophistiqués, couvrant une panoplie de domaines.
Chaque prompt est présenté avec son cas d'usage, son domaine et son contenu copiable.

### 3.2 Formations

Section réservée aux formations proposées par Synapse : présentation, contenu, format et modalités d'accès.

### 3.3 Jeux & mini-concours

**Rôle : vitrine et enregistrement — rien de collaboratif ni de complexe.**

La plateforme présente le jeu ou l'activité (règles, dates, lots, format) et permet à l'utilisateur de **s'inscrire**. Le déroulement effectif a lieu **ailleurs** : en présentiel ou sur un autre canal hors plateforme.

Autrement dit : on présente, on inscrit, on n'héberge pas le jeu.

### 3.4 Bons plans & opportunités

Opportunités en lien avec l'écosystème Synapse : programmes de recrutement, stages, collaborations, appels d'offres, fonds de financement de projets, etc.

---

## 4. Modèle d'accès : gratuit / premium

Le contenu n'est **pas systématiquement gratuit**. Chaque élément des quatre rubriques (prompt, formation, concours, opportunité) peut être marqué comme **libre** ou **réservé aux membres premium**.

**Le modèle premium :**

| Aspect       | Choix retenu                               |
| ------------ | ------------------------------------------ |
| Type         | Paiement **unique**, pas d'abonnement      |
| Contrepartie | Accès **à vie** à l'intégralité du contenu |
| Moyens visés | Wave, mobile money                         |
| Prérequis    | Créer un compte, puis payer une fois       |

> **Périmètre v1 — important**
> Le paiement **n'est pas implémenté** dans cette première version : pas d'agrégateur, pas de PSP, pas de webhook de paiement.
> On se contente de **présenter le parcours visuellement** (logique _mockup_) : verrouillage du contenu premium, écran d'offre, tunnel d'achat factice.
> Le moyen de paiement réel arrivera en **v2**.
>
> Le verrouillage doit malgré tout être **réel côté serveur** dès la v1 : un contenu premium ne doit jamais transiter vers un utilisateur non premium, même si l'attribution du statut premium se fait manuellement pour l'instant.

---

## 5. Le contenu

Le contenu éditorial est fourni hors Git dans `ressources/`, puis validé et
importé par la commande de seed Prisma. Le catalogue v1 contient **69 prompts : 20
FREE et 49 PREMIUM**. Le dossier `ressources/` est absent de tout l'historique
Git afin qu'aucun corps premium ne soit publié avec le code. Le contrat complet
de l'import est décrit dans [docs/import-ressources.md](docs/import-ressources.md).

---

## 6. Stack technique

Architecture **Backend For Frontend (BFF)** avec Next.js : le frontend et le backend vivent dans la même application, le backend étant exposé via les Route Handlers et Server Actions de Next.js. Souple, léger et largement suffisant pour ce projet.

| Couche                    | Technologie                             |
| ------------------------- | --------------------------------------- |
| Application (front + BFF) | Next.js (App Router), TypeScript strict |
| Base de données           | PostgreSQL                              |
| ORM & migrations          | Prisma                                  |

Les conventions détaillées — architecture en couches, règles de sécurité, standards de code, workflow — sont décrites dans [AGENTS.md](AGENTS.md), qui fait autorité pour toute contribution.

### Deux chemins de lecture complémentaires

Une page rendue par le serveur, comme `/prompts`, appelle directement son
service métier. Elle ne fait pas de requête HTTP vers sa propre API.

Un composant client qui doit charger les mêmes données passe exclusivement par
la fonction partagée de `src/lib/api.ts`. Celle-ci appelle le Route Handler
`GET /api/prompts`, qui délègue au même service. Dans les deux cas, le service
reste l'unique entrée vers le repository Prisma et PostgreSQL.

---

## 7. Périmètre v1 / suite

**Dans la v1**

- Les quatre rubriques, en consultation
- Compte utilisateur (inscription, connexion)
- Distinction contenu libre / premium, avec verrouillage serveur effectif
- Inscription aux jeux & concours et aux formations événementielles
- Parcours de paiement en mockup

**Explicitement hors v1**

- Paiement réel, PSP, webhook et attribution automatique du statut premium
- E-mails de confirmation, notification ou récupération de compte
- Interface d'administration et dashboard
- Déroulement des jeux sur la plateforme
- Recherche avancée, archive des opportunités expirées et listes d'attente
- Fournisseurs OAuth, vérification d'adresse e-mail et mot de passe oublié
- Suppression de compte et export de ses données en libre-service
- Upload de fichiers ou d'images depuis l'interface
- Thème sombre, PWA installable et formulaire de contact

La prochaine étape est **l'administration en premier** pour remplacer le
réimport manuel. Le paiement réel reste ultérieur, en v2. Aucun dashboard et
aucune voie publique vers `grantPremium` ne font partie de la v1 : la promotion
reste une opération d'administration explicite et tracée par script.

Les limites et preuves de sortie sont détaillées dans
[docs/recette-v1.md](docs/recette-v1.md).

---

_Dernière mise à jour : 2026-08-10_

## Démarrage local depuis zéro

Prévoir Node.js 20.9 ou plus récent ainsi que Docker, puis exécuter les commandes suivantes dans l’ordre :

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npx prisma migrate dev
npx prisma db seed
npm run dev
```

L’application est ensuite disponible sur `http://localhost:3000`.

## Mise en ligne v1

La cible retenue est **Vercel** avec un PostgreSQL managé. Aucun fournisseur de
base n'est imposé par le dépôt. Le fournisseur choisi doit proposer une URL de
pooling compatible serverless pour `DATABASE_URL`, une connexion directe pour
`prisma migrate deploy`, des sauvegardes actives et une restauration vers une
base isolée. Ces capacités sont des prérequis bloquants, pas des options à
activer après le lancement.

La procédure complète, y compris la vérification d'une restauration, se trouve
dans [docs/deploiement-v1.md](docs/deploiement-v1.md).
