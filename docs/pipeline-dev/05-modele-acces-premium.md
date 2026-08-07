# 05 — Modèle d'accès premium

> **Nature :** tranche verticale — **risque maximal du projet** · **Dépend de :** `04` · **Prépare :** `06`, `07`, `08`, `09`, `10`

---

## Objectif

Rendre le verrouillage premium **réel côté serveur**, sur la rubrique Prompts uniquement. À la fin de cette tranche, un contenu marqué `PREMIUM` est inaccessible à un visiteur anonyme et à un membre `FREE` — non pas masqué, mais **jamais envoyé**.

## Pourquoi ici

**Risque maximal, donc le plus tôt possible.** C'est la règle qui justifie le modèle économique : si le contenu premium fuit, le produit n'a plus de raison d'être payant. Or ce type de fuite ne se voit pas à l'écran — elle se voit dans le HTML, dans le payload RSC, dans une réponse d'API.

**Avant la réplication (`08`), impérativement.** Le mécanisme est reproduit à l'identique dans quatre rubriques. Une erreur de conception ici se paie quatre fois, et se corrige quatre fois. C'est exactement la situation que le principe « patron validé, puis réplication » cherche à éviter.

**Après l'auth (`04`)** parce que l'entitlement a besoin d'une identité, et **avant la rubrique complète (`07`)** parce qu'il vaut mieux valider le mécanisme sur un contenu pauvre que sur un écran riche.

---

## Contenu

### Modèle

- `enum Visibility { FREE PREMIUM }`, champ `visibility` sur `Prompt` (défaut `FREE`).
- Champ `body` sur `Prompt` — **le champ verrouillé**. Il est introduit ici parce que c'est ici qu'on apprend à ne pas le laisser fuir.
- `membership` sur `User` existe déjà depuis la tranche `04`.

### Le point unique de vérité

```ts
// src/server/access/entitlement.ts
export function canAccess(user: SessionUser | null, content: { visibility: Visibility }): boolean {
  if (content.visibility === "FREE") return true
  return user?.membership === "PREMIUM"
}
```

Une seule fonction, appelée par tous les services. Aucune autre expression de cette règle dans le projet — pas de `visibility === "FREE" ||` disséminé dans un composant.

### La règle qui compte vraiment

Le champ verrouillé **n'est pas chargé depuis la base** quand l'utilisateur n'y a pas droit :

```ts
// ✅ le corps n'existe jamais en mémoire côté serveur
const prompt = await promptRepository.findBySlug(slug, { includeBody: entitled })

// ❌ interdit, même si le résultat semble identique
const prompt = await promptRepository.findBySlug(slug)
return entitled ? prompt : omit(prompt, ["body"])
```

La seconde forme paraît équivalente. Elle ne l'est pas : le corps transite en mémoire, et finira par ressortir — dans un log d'erreur, dans un payload RSC, dans un `JSON.stringify` de débogage, dans la prochaine refactorisation faite par quelqu'un qui ignore la règle. **Ne pas charger la donnée est la seule défense qui survit aux erreurs des autres.**

### Deux DTO par contenu

- `PromptTeaser` — titre, résumé, tags, badge premium. Servi à tout le monde.
- `PromptFull` — le teaser **plus** le `body`. Servi uniquement à un utilisateur entitled.

Ce sont deux types distincts, pas un type avec un champ optionnel. Le compilateur doit rendre impossible de renvoyer un `PromptFull` sans avoir vérifié l'entitlement.

### Rendu

- `PremiumGate` est **purement visuel** : il affiche un cadenas et un appel à l'action quand le serveur n'a pas envoyé le corps. Il ne masque jamais une donnée présente. C'est un composant qui *constate*, il ne *décide* pas.
- Attention au **payload RSC** : un Server Component qui passe l'objet complet en props à un Client Component sérialise tout, y compris ce qui n'est pas affiché. Ne passer que les champs utilisés.

### Attribution du statut premium

En v1, aucun paiement. La promotion se fait par une **opération d'administration explicite et tracée** — un script `npm run grant-premium -- <email>`, pas une route.

**Aucune route publique, aucune Server Action ne doit pouvoir modifier `membership`.** C'est vérifié par un test.

---

## Livrable démontrable

Un prompt marqué `PREMIUM` :
- visiteur anonyme → teaser + cadenas ; `curl` sur l'API ne renvoie **aucun** `body` ;
- membre `FREE` connecté → même chose ;
- après `npm run grant-premium`, **sans reconnexion** (stratégie de session `database`), le même membre voit le corps complet.

La démonstration à faire est celle du `curl` et du « Afficher le code source », pas celle de l'écran.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Test asserté sur le **JSON brut** de la réponse HTTP : `body` absent pour anonyme et pour `FREE`. Pas d'assertion sur le rendu React.
- [ ] Test sur le **HTML servi** : le corps du prompt n'apparaît nulle part dans la page, payload RSC compris.
- [ ] Test : aucune route ni Server Action publique ne peut modifier `membership`.
- [ ] Test : un membre promu voit le contenu **sans se reconnecter** — c'est ce qui valide le choix de la stratégie `database`.
- [ ] `canAccess` est appelée depuis les services uniquement. Recherche textuelle dans le projet : aucune autre expression de la règle.
- [ ] Les deux DTO sont des types distincts, pas un champ optionnel.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Filtrer au mapping plutôt qu'au `select` | La donnée transite et finira par fuiter | `select: { body: entitled }` dans le repository |
| Objet complet passé en props à un Client Component | Le corps est dans le payload RSC, lisible dans l'onglet réseau | Passer les champs un par un, explicitement |
| Tester le gating via le rendu React | Le test passe alors que la donnée est dans la page | Asserter sur le JSON brut et sur le HTML |
| Un champ `body?: string` optionnel | Rien n'empêche de le remplir par erreur | Deux types distincts, garantis par le compilateur |
| Cache Next sur une page dépendant de la session | Une page premium mise en cache et servie à tous — la fuite la plus grave possible | Route dynamique + `cache: "no-store"` sur tout ce qui dépend de la session |
| Une route d'admin « pratique » pour promouvoir | Élévation de privilège à un `curl` de distance | Script en ligne de commande, jamais de route |

---

## À trancher

- **Que montre le teaser d'un contenu premium ?** Titre + résumé seuls, ou un extrait du corps (premières lignes) ? Un extrait convertit mieux mais élargit la surface de fuite et doit alors être un **champ distinct en base** (`excerpt`), jamais une troncature du `body` calculée à la volée. Recommandation : champ `excerpt` séparé, rempli à l'enrichissement.
- **Granularité du premium.** Tout-ou-rien par contenu (retenu ici), ou par rubrique ? Le tout-ou-rien par contenu est plus souple et ne coûte rien de plus.
