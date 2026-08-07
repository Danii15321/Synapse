# 08 — Réplication : Formations et Opportunités

> **Nature :** réplication du patron · **Dépend de :** `07` · **Prépare :** `11`

---

## Objectif

Livrer les rubriques **Formations** et **Bons plans & opportunités** au même niveau de finition que Prompts, en appliquant le patron figé en `07`.

## Pourquoi ici

Application directe du principe **« patron validé, puis réplication »**. Ces deux rubriques n'apportent **aucun problème nouveau** : même structure de contenu, même verrouillage premium, même jeu de tests. Leur seule spécificité est un ou deux champs métier.

Elles sont regroupées dans une seule tranche parce qu'il s'agit du même travail fait deux fois. Si la deuxième prend autant de temps que la première, c'est le signe que le patron n'est pas assez explicite — c'est une information à exploiter, pas à ignorer.

**Attente de rythme :** chaque rubrique doit demander nettement moins d'effort que `07`. Si ce n'est pas le cas, s'arrêter et corriger le patron avant de continuer.

---

## Contenu

### Formations — spécificités

```prisma
model Formation {
  // — champs communs, identiques à Prompt —
  id, slug, title, summary, excerpt, body, visibility, publishedAt, createdAt, updatedAt

  // — spécifique —
  level       Level     // DEBUTANT | INTERMEDIAIRE | AVANCE
  format      Format    // PRESENTIEL | EN_LIGNE | HYBRIDE
  durationH   Int?      // durée en heures
  startsAt    DateTime? // session datée, si applicable
  coverImage  String?   // convention média posée en `06`, repli si absent
}
```

Le `body` contient le programme détaillé — **c'est le champ verrouillé** pour une formation premium.

Point d'attention : une formation avec `startsAt` dépassée doit-elle disparaître ? Voir « À trancher ».

### Opportunités — spécificités

```prisma
model Opportunite {
  // — champs communs —
  id, slug, title, summary, excerpt, body, visibility, publishedAt, createdAt, updatedAt

  // — spécifique —
  type        OpportuniteType // STAGE | EMPLOI | APPEL_OFFRE | FINANCEMENT | COLLABORATION
  organisme   String
  deadline    DateTime?       // date limite de candidature
  externalUrl String?         // lien de candidature — souvent LA valeur premium
  coverImage  String?         // logo de l'organisme ou visuel, convention posée en `06`
}
```

Deux particularités réelles :

1. **La péremption.** Une opportunité dont la `deadline` est passée ne doit plus apparaître dans la liste principale. Le filtre va **dans le repository**, comme `publishedAt` — jamais dans la vue. C'est le seul mécanisme nouveau de cette tranche, et il mérite son propre test.

2. **`externalUrl` est un champ verrouillé.** Pour une opportunité premium, le lien de candidature est souvent ce que le membre paie. Il doit suivre exactement le même traitement que `body` : **non chargé** quand l'utilisateur n'y a pas droit, jamais présent dans le payload RSC. C'est le piège de cette tranche — l'attention se porte naturellement sur `body` et on oublie l'URL.

---

## Marche à suivre, par rubrique

Reprendre le document « patron de rubrique » (`docs/patron-rubrique.md`) produit en `07` :

1. Modèle Prisma + migration + index sur les colonnes filtrées.
2. Schémas Zod dans `lib/validators/`.
3. Repository (`select` explicite, curseur, filtres de publication **et de péremption**).
4. Service (teaser/full via `canAccess`).
5. Route Handlers.
6. `lib/api.ts` + hook.
7. Composants + pages liste et détail.
8. Le jeu de tests complet du gabarit `07`.
9. Contrat de ressources : `ressources/formations/README.md` et `ressources/opportunites/README.md`, avec deux exemples chacun.

---

## Règle de divergence

> Si une rubrique ne rentre pas dans le patron, **on ne bifurque pas en silence**.

Deux cas, deux traitements :

- **Le patron est incomplet** → on le met à jour, on répercute sur Prompts, et on continue. Coût immédiat, dette évitée.
- **La rubrique est réellement différente** → on documente la divergence dans son fichier et dans le patron, en expliquant pourquoi.

Ce qui est interdit, c'est la troisième voie : copier le patron en l'adaptant à la main sans le dire. Au bout de trois rubriques, plus personne ne sait laquelle fait autorité.

---

## Livrable démontrable

Trois rubriques sur quatre sont finies, homogènes à l'usage, avec le même comportement de verrouillage. Une opportunité périmée n'apparaît plus. Les trois contrats de ressources permettent de produire du contenu.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Le jeu de tests complet est répliqué pour chaque rubrique — **y compris le test de gating sur le JSON brut**.
- [ ] Test spécifique : une opportunité dont la `deadline` est passée n'apparaît pas dans la liste.
- [ ] Test spécifique : `externalUrl` est absent du JSON **et** du HTML pour un utilisateur non entitled.
- [ ] Contrats de ressources écrits, avec deux exemples réels chacun.
- [ ] Le document « patron de rubrique » est à jour de tout écart constaté.
- [ ] Les trois rubriques se ressemblent : un développeur qui connaît l'une sait naviguer dans les autres.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Ne verrouiller que `body` | Le lien de candidature premium fuite | Recenser **tous** les champs verrouillés par rubrique, les traiter pareil |
| Filtre de péremption dans le composant | Une opportunité expirée reste visible par une autre entrée | Filtre dans le repository, testé |
| Copie-colle avec adaptations silencieuses | Trois variantes du même code, plus de patron | Règle de divergence appliquée strictement |
| Tests allégés « puisque c'est la même chose » | Le gating n'est vérifié que sur une rubrique | Le jeu de tests fait partie du patron, pas des options |
| Migrations empilées sans index | Listes lentes dès quelques centaines de lignes | Index sur `publishedAt`, `deadline`, `type`, `level` |

---

## À trancher

- **Formation dont la date de session est passée.** La masquer, ou l'afficher en « session passée » ? Recommandation : la garder visible et marquée — une formation reste un contenu de fond, contrairement à une opportunité qui devient sans objet.
- **Opportunités périmées : archive consultable ?** Recommandation : hors liste principale en v1, pas d'archive. Simple, et personne ne la réclamera avant d'avoir du volume.
- **Une formation renvoie-t-elle vers une inscription ?** Si oui, elle rejoint le mécanisme de la tranche `09` et ne relève plus de la simple réplication. À décider **avant** de commencer cette tranche.
