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

| Aspect | Choix retenu |
|---|---|
| Type | Paiement **unique**, pas d'abonnement |
| Contrepartie | Accès **à vie** à l'intégralité du contenu |
| Moyens visés | Wave, mobile money |
| Prérequis | Créer un compte, puis payer une fois |

> **Périmètre v1 — important**
> Le paiement **n'est pas implémenté** dans cette première version : pas d'agrégateur, pas de PSP, pas de webhook de paiement.
> On se contente de **présenter le parcours visuellement** (logique *mockup*) : verrouillage du contenu premium, écran d'offre, tunnel d'achat factice.
> Le moyen de paiement réel arrivera en **v2**.
>
> Le verrouillage doit malgré tout être **réel côté serveur** dès la v1 : un contenu premium ne doit jamais transiter vers un utilisateur non premium, même si l'attribution du statut premium se fait manuellement pour l'instant.

---

## 5. Le contenu

Le contenu éditorial **n'est pas à créer dans le cadre du développement**.

Il sera fourni dans un dossier `ressources/`, créé ultérieurement. Le moment venu, ce dossier servira de source pour **peupler la base de données** (script de seed). L'étape de peuplement sera positionnée explicitement dans la pipeline, plus tard.

Tant que `ressources/` n'existe pas, le développement s'appuie sur des **données de démonstration** clairement identifiées comme telles.

---

## 6. Stack technique

Architecture **Backend For Frontend (BFF)** avec Next.js : le frontend et le backend vivent dans la même application, le backend étant exposé via les Route Handlers et Server Actions de Next.js. Souple, léger et largement suffisant pour ce projet.

| Couche | Technologie |
|---|---|
| Application (front + BFF) | Next.js (App Router), TypeScript strict |
| Base de données | PostgreSQL |
| ORM & migrations | Prisma |

Les conventions détaillées — architecture en couches, règles de sécurité, standards de code, workflow — sont décrites dans [AGENTS.md](AGENTS.md), qui fait autorité pour toute contribution.

---

## 7. Périmètre v1 / v2

**Dans la v1**
- Les quatre rubriques, en consultation
- Compte utilisateur (inscription, connexion)
- Distinction contenu libre / premium, avec verrouillage serveur effectif
- Inscription aux jeux & concours
- Parcours de paiement en mockup

**Reporté en v2**
- Paiement réel (Wave / mobile money) et attribution automatique du statut premium
- Tout ce qui relève du collaboratif ou du déroulement des jeux sur la plateforme

---

*Dernière mise à jour : 2026-08-07*

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
