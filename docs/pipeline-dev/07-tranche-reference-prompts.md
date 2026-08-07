# 07 — Tranche de référence : Prompts

> **Nature :** tranche verticale complète — **définit le patron** · **Dépend de :** `06` · **Prépare :** `08`, `09`, `11`

---

## Objectif

Terminer la rubrique **Prompts** au niveau de finition de la v1, et **figer le patron** que les rubriques suivantes répliqueront : structure de fichiers, découpage des DTO, jeu de tests, états d'écran, format des ressources éditoriales.

## Pourquoi ici

C'est l'application du principe **« patron validé, puis réplication »**. Tout le temps investi ici est récupéré trois fois en `08` et `09`.

Prompts est le bon support : c'est la rubrique la plus simple (un contenu, pas de date, pas d'inscription), donc celle où le patron sera le plus lisible et le moins pollué par des cas particuliers.

Cette tranche produit aussi le **contrat de ressources**, qui vous débloque : dès qu'elle est terminée, vous pouvez écrire le contenu éditorial sans attendre la tranche `11`.

---

## Contenu

### Modèle complet

```prisma
model Prompt {
  id          String     @id @default(cuid())
  slug        String     @unique
  title       String
  summary     String
  excerpt     String?    // accroche affichée sur un contenu verrouillé
  body        String     // LE champ verrouillé
  domain      String     // domaine métier — voir « À trancher »
  tags        String[]
  coverImage  String?    // chemin sous public/, convention posée en `06` ; repli si absent
  visibility  Visibility @default(FREE)
  publishedAt DateTime?  // null = brouillon, jamais servi
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([publishedAt, domain])
}
```

`publishedAt` est filtré **dans le repository**, jamais dans la vue. Un brouillon ne doit pas atteindre la couche présentation.

### Liste

- Pagination **par curseur** (`take` + `cursor`), pas par `offset` — plus stable et plus rapide quand le volume grandit.
- Filtre par domaine et par tag.
- Recherche textuelle simple sur `title` et `summary`. Pas de recherche full-text PostgreSQL en v1 : `ILIKE` avec un index suffit au volume attendu, et l'ajouter plus tard ne casse rien.
- Les quatre états : chargement, erreur, **liste vide** (fréquente avec des filtres actifs), succès.

### Détail

- `app/(public)/prompts/[slug]/page.tsx`, Server Component.
- Contenu complet ou teaser + `PremiumGate`, selon l'entitlement — mécanisme de la tranche `05`, appliqué tel quel.
- **Copie du prompt en un tap** : le seul composant client de la rubrique. Sur mobile, c'est la fonctionnalité qui donne sa valeur d'usage à la rubrique.
- Métadonnées SEO et Open Graph — le contenu a vocation à être partagé sur les réseaux. **Vérifier que la carte de partage d'un contenu premium n'expose pas le corps.**

### Contrat de ressources — le livrable qui vous débloque

Figer et documenter le format attendu dans `ressources/prompts/`. Recommandation : **un fichier Markdown par prompt**, avec frontmatter.

```markdown
---
slug: audit-plan-affaires
title: Auditer un plan d'affaires en 10 points
summary: Un prompt qui fait relire un business plan comme le ferait un investisseur.
excerpt: Commence par identifier les trois hypothèses les plus fragiles…
domain: entrepreneuriat
tags: [business-plan, financement]
visibility: PREMIUM
publishedAt: 2026-08-01
---

Le corps du prompt, en Markdown.
```

Le Markdown avec frontmatter est préférable au JSON : le corps d'un prompt est du texte long, souvent multi-ligne, et l'échappement JSON le rend pénible à écrire et à relire.

Ce format doit être décrit dans un fichier `ressources/prompts/README.md` **écrit pendant cette tranche**, avec deux exemples réels — un gratuit, un premium.

### Tests — le gabarit à répliquer

Le jeu de tests écrit ici devient le modèle des rubriques suivantes :

| Niveau | Cas couverts |
|---|---|
| Repository | `select` explicite, pagination par curseur, exclusion des brouillons, `includeBody` |
| Service | Mapping teaser/full, filtres, erreur `ContentNotFound` |
| API | 200, 404, pagination, **gating asserté sur le JSON brut** |
| E2E | Liste → détail → copie ; parcours anonyme, `FREE`, `PREMIUM` |

---

## Livrable démontrable

La rubrique Prompts est **finie** : navigation, filtres, recherche, pagination, détail, copie, verrouillage premium, le tout fluide sur 390px. Le fichier `ressources/prompts/README.md` permet à une personne non développeuse de produire du contenu.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Un document **« patron de rubrique »** est écrit dans **`docs/patron-rubrique.md`** — hors de `docs/pipeline-dev/`, qui est en lecture seule. Il liste les fichiers à créer, dans l'ordre, pour une nouvelle rubrique.
- [ ] La **carte de contenu de référence** est définie ici et **remplace la carte provisoire** de l'accueil posée en `06`.
- [ ] Le contrat de ressources est écrit, avec deux exemples réels dans `ressources/prompts/`.
- [ ] La pagination est testée sur un jeu de données volumineux (≥ 200 lignes générées).
- [ ] Aucune requête N+1 sur la liste — vérifié en activant les logs de requêtes Prisma.
- [ ] Les métadonnées de partage d'un contenu premium **n'exposent pas** le corps.
- [ ] Vérifié à 390px avec bridage réseau : liste utilisable en connexion dégradée.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Pagination par `offset` | Doublons et sauts quand du contenu est ajouté ; lente en fin de liste | Curseur dès maintenant — migrer après coûte cher |
| Brouillons filtrés dans le composant | Un `publishedAt` oublié dans une requête publie tout | Filtre **dans le repository**, testé |
| Corps du prompt dans les métadonnées Open Graph | Contenu premium lisible dans l'aperçu de partage | Utiliser `summary`, jamais `body` |
| `"use client"` sur la page pour un bouton « Copier » | Toute la page devient cliente, le SEO et la perf s'effondrent | Un composant client minuscule, isolé |
| Contrat de ressources « à préciser plus tard » | Le contenu est écrit dans un format inutilisable, à retaper | Le figer ici, avec deux exemples réels |
| Markdown des ressources rendu tel quel | Injection HTML depuis un fichier de contenu | Rendu sans HTML inline, ou assainissement — traiter `ressources/` comme non fiable |

---

## À trancher — questions qui bloquent le contenu

Ces réponses conditionnent le contrat de ressources. À répondre **pendant** cette tranche, pas après.

- **Liste des domaines.** Fermée (enum, cohérence garantie, ajout = migration) ou libre (souple, mais fautes de frappe et doublons) ? Recommandation : **enum fermé** — `ia`, `entrepreneuriat`, `productivite`, `communication`… La cohérence des filtres compte plus que la souplesse, et la liste bougera peu.
- **Les tags sont-ils libres ?** Recommandation : oui, `String[]`, avec normalisation en minuscules sans accents à l'import.
- **Un prompt a-t-il un auteur affiché ?** Si oui, c'est un champ à ajouter maintenant, pas une migration en tranche `11`.
