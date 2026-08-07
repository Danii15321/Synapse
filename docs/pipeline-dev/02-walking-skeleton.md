# 02 — Walking skeleton

> **Nature :** tranche verticale minimale · **Dépend de :** `01` · **Prépare :** toutes les tranches fonctionnelles

---

## Objectif

Faire passer **un fil unique et volontairement pauvre** à travers l'intégralité de l'architecture, avec un test à chaque niveau. Le squelette ne rend presque aucun service à l'utilisateur ; il prouve que les couches se parlent.

```
Page (public)/prompts  →  GET /api/prompts  →  promptService  →  promptRepository  →  Prisma  →  PostgreSQL
        ▲                       ▲                    ▲                   ▲
     test E2E            test intégration      test unitaire      test sur vraie base
```

## Pourquoi ici

C'est le cœur du principe de Cockburn : **on ne sait pas si une architecture tient tant qu'on ne l'a pas traversée**. Tout ce que les tranches suivantes ajoutent (auth, gating, rubriques) ne fait qu'épaissir ce fil. Si le fil est faux, mieux vaut le découvrir maintenant, quand il fait 200 lignes.

On choisit **Prompts** comme support parce que c'est la rubrique qui deviendra le patron de référence en tranche `07`. Le squelette n'est donc pas du code jetable : il est le premier étage de la rubrique.

---

## Contenu

### Modèle — délibérément pauvre

```prisma
model Prompt {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  summary   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Pas de `body`, pas de `visibility`, pas de `tags`. Ces champs arrivent avec les tranches qui en ont besoin (`05` et `07`). Les ajouter maintenant reviendrait à écrire du code qu'aucun test ne justifie encore.

### Les couches, une par une

- **Migration** : `npx prisma migrate dev --name add_prompt`.
- **Seed** : `prisma/seed.ts` insère deux prompts en dur, en `upsert` sur le `slug` pour être rejouable. C'est l'embryon du seed de la tranche `11`.
- **Repository** — `server/repositories/prompt-repository.ts` : `findMany` avec `select` explicite et `take` obligatoire. Aucune règle métier.
- **Service** — `server/services/prompt-service.ts` : `import "server-only"`, retourne un DTO mappé, ne connaît pas HTTP.
- **Route Handler** — `app/api/prompts/route.ts` : appelle le service, sérialise.
- **Client** — `lib/api.ts` expose `getPrompts()`. C'est le seul endroit du projet qui fait un `fetch`.
- **Page** — `app/(public)/prompts/page.tsx`, Server Component, qui appelle **le service directement** (pas un `fetch` vers sa propre API). Le Route Handler existe pour les besoins client à venir.

Cette double entrée — page via le service, client via le handler — est le point le plus important à valider ici. Elle doit être fonctionnelle **et** documentée, sinon la tranche `07` la réinventera de travers.

### Tests — un à chaque étage

| Niveau | Ce qui est vérifié |
|---|---|
| Repository | Sur une vraie base : le `select` ne renvoie que les champs attendus, le `take` borne bien |
| Service | Le mapping row → DTO, sur des données en mémoire |
| Route Handler | `GET /api/prompts` renvoie 200 et un tableau au bon format |
| E2E Playwright | Ouvrir `/prompts`, voir les deux prompts du seed |

---

## Hors périmètre — explicitement

Ces sujets **ne sont pas** dans cette tranche, et les y ramener casserait sa raison d'être :

- Authentification, sessions, notion d'utilisateur
- Contenu premium, verrouillage, `visibility`
- Pagination, recherche, filtres
- Design abouti — un rendu lisible sur 390px suffit
- Page de détail d'un prompt

---

## Livrable démontrable

Depuis un clone frais : `docker compose up -d postgres` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev`, puis `/prompts` affiche deux prompts **lus en base**. Les quatre tests passent en CI.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Les quatre niveaux de test existent et passent — c'est le critère central de cette tranche.
- [ ] Le test de repository tourne sur PostgreSQL en CI, pas sur SQLite ni sur un mock.
- [ ] La page est un Server Component sans `"use client"`.
- [ ] Le chemin « Server Component → service » et le chemin « client → handler » sont tous deux fonctionnels.
- [ ] `npx prisma db seed` est **rejouable** : le lancer deux fois ne duplique rien et ne plante pas.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Une page qui fait `fetch("/api/prompts")` depuis le serveur | Un aller-retour HTTP inutile vers soi-même, plus lent et plus fragile | Un Server Component appelle le **service**, jamais sa propre API |
| Mocker Prisma « pour aller plus vite » | Le premier vrai bug de requête passera au travers | Vraie base en test, conteneur jetable en CI |
| Enrichir le modèle « tant qu'on y est » | Le squelette perd sa valeur de preuve et la tranche s'étire | Les champs arrivent avec la tranche qui les justifie |
| Un seed qui `create` au lieu d'`upsert` | Deuxième exécution en erreur, base à recréer sans cesse | `upsert` sur le `slug` dès le premier seed |

---

## À trancher

- **Nommage des URL publiques.** `/prompts`, `/formations`, `/jeux`, `/opportunites` — à figer maintenant, parce que ces chemins deviendront des liens partagés et changeront difficilement ensuite.
