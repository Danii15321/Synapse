# 03 — Socle de sécurité transverse

> **Nature :** socle transverse — **exception assumée au slicing vertical** · **Dépend de :** `02` · **Prépare :** `04` et tout le reste

---

## Objectif

Poser les mécanismes de sécurité **qui ne sont rattachés à aucune fonctionnalité** : headers HTTP, limitation de débit, gestion d'erreurs sans fuite, journalisation structurée, validation d'entrée outillée.

## Pourquoi ici

C'est la seule tranche de la pipeline qui ne livre pas de capacité utilisateur. Sa position est un **arbitrage de risque explicite**, pas un oubli de méthode :

- Une **CSP stricte** posée après coup est un chantier. Entre-temps, les `unsafe-inline` s'installent, les scripts tiers arrivent, et durcir la politique casse des écrans déjà validés. Posée sur trois pages, elle ne coûte presque rien.
- La **gestion d'erreurs** doit exister avant la première fonctionnalité qui lève des erreurs — donc avant l'authentification en `04`.
- Le **rate limiting** doit exister avant qu'il y ait une route de connexion à protéger. Le construire *avec* l'auth mélange deux sujets et produit une protection taillée pour un seul cas.

L'inverse — commencer par l'auth — mènerait à écrire deux fois la couche d'erreurs et à protéger `/api/auth` avec un mécanisme ad hoc.

---

## Contenu

### Headers de sécurité

Implémenter les headers listés dans [AGENTS.md](../../AGENTS.md#headers-http-définis-dans-nextconfigts-etou-middlewarets), dans `next.config.ts` et/ou `middleware.ts`.

Le point difficile est la **CSP avec nonce** : Next injecte ses propres scripts, et une politique naïve casse l'hydratation. Il faut générer un nonce par requête dans le middleware et le propager. C'est précisément le genre de travail qu'on ne veut pas faire une fois que trente écrans existent.

### Limitation de débit

Compteur en **PostgreSQL** — pas de Redis, conformément à AGENTS.md.

- Une table dédiée (clé = identifiant d'appelant + fenêtre), fenêtre glissante ou par paliers.
- Deux régimes : **60 req/min** en général, **10 req/min** sur les routes sensibles (`/api/auth/*`, inscriptions).
- Réponse `429` avec l'en-tête `Retry-After`.
- Nettoyage des lignes expirées, pour que la table ne grossisse pas indéfiniment.
- L'identification par IP derrière un proxy est un piège : ne faire confiance à `X-Forwarded-For` **que** si l'hébergement le garantit, sinon on offre un contournement trivial.

### Erreurs

- Hiérarchie d'erreurs domaine dans `server/errors/` : `ContentNotFoundError`, `NotEntitledError`, `ValidationError`, `RateLimitedError`.
- Un mapping unique **erreur domaine → statut HTTP**, appelé depuis les Route Handlers. Aucun service ne connaît de code HTTP.
- Toute réponse d'erreur : message générique + `errorId` (UUID). Le détail — y compris le message Prisma — part dans les logs serveur, jamais dans la réponse.
- `app/error.tsx` et `app/not-found.tsx` cohérents avec ce format, sur 390px.

### Journalisation

- Logs JSON structurés, avec `errorId`, route, méthode, statut, durée.
- **Rédaction obligatoire** : mots de passe, cookies de session, tokens, corps de contenu premium ne sont jamais journalisés. À implémenter comme une liste de champs filtrés dans le logger, pas comme une discipline individuelle.
- `DATABASE_URL` jamais journalisée, jamais affichée dans une page d'erreur.

### Validation outillée

Un helper unique qui parse le body d'une requête avec un schéma Zod `.strict()` et lève une `ValidationError` exploitable. Sans ce helper, chaque handler réinventera son parsing, et l'un d'eux oubliera le `.strict()`.

---

## Livrable démontrable

Sur `/prompts` (l'écran de la tranche 02) :
- `curl -I` montre tous les headers de sécurité, CSP comprise, et la page s'hydrate correctement.
- 70 requêtes rapides sur `/api/prompts` renvoient des `429` après le seuil.
- Une erreur provoquée renvoie un message générique + un `errorId`, retrouvable dans les logs — **sans aucune stack trace côté client**.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Un test automatique vérifie la **présence de chaque header** de la liste AGENTS.md.
- [ ] Un test automatique vérifie que le rate limiting renvoie bien `429` au-delà du seuil, et se relâche après la fenêtre.
- [ ] Un test automatique vérifie qu'une exception interne **ne fait fuir ni stack trace ni message Prisma** dans la réponse HTTP.
- [ ] La CSP ne contient ni `unsafe-inline` ni `unsafe-eval`, et l'application fonctionne — les deux à la fois.
- [ ] `npm audit` devient **bloquant** en CI à partir de cette tranche.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| `unsafe-inline` ajouté « temporairement » pour débloquer l'hydratation | Il ne sera jamais retiré, la CSP ne protège plus de rien | Nonce par requête, réglé maintenant sur trois pages |
| Rate limiting par IP avec `X-Forwarded-For` non vérifié | En-tête falsifiable, limite contournable en une ligne | Ne faire confiance au header que si le proxy le réécrit ; sinon IP de connexion |
| Erreur Prisma renvoyée telle quelle | Fuite de noms de tables, de colonnes, de contraintes | Mapping centralisé, message générique, détail en logs |
| Logger l'objet requête complet | Cookies de session dans les journaux | Liste de champs filtrés **dans** le logger |
| Table de rate limiting jamais purgée | Croissance sans fin, requêtes de plus en plus lentes | Purge des lignes expirées prévue dès l'écriture |

---

## À trancher

- **Identification pour le rate limiting.** Par IP seule, ou par IP + utilisateur une fois la session disponible en `04` ? Recommandation : IP maintenant, affiner en `04` sans changer la structure.
- **Destination des logs en v1.** `stdout` suffit en local. Une décision d'agrégation n'est nécessaire qu'au déploiement (tranche `12`).
