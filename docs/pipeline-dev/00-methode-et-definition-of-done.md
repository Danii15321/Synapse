# 00 — Méthode, tranches et Definition of Done

> Ce fichier explique **comment lire et exécuter** la pipeline. Il ne contient aucune tâche de développement.
> Les tranches se lisent dans l'ordre `01` → `12`. L'objectif final : une **v1 fonctionnelle, testable en local**.

> ### ⛔ Avant toute exécution
> Cette pipeline est un **contrat en lecture seule**. Les fichiers `00` à `12` ne se modifient pas, et aucune tranche ne s'ajoute.
> L'exécution passe par le skill **[chef-projet](../../.claude/skills/chef-projet/SKILL.md)** (`/chef-projet <NN>`), qui pilote trois agents isolés en TDD : un écrit les tests, un implémente, un audite.
> Un blocage ou un désaccord avec le plan se traite par un **écart** consigné dans `docs/journal/`, suivi d'un arrêt — jamais par une modification de ce dossier.

---

## Les principes retenus

### 1. Slicing vertical — le principe englobant

Chaque tranche traverse **toutes les couches**, de la base de données à l'écran mobile. On ne livre jamais « la couche repository » ou « les écrans » : on livre *une capacité utilisable*.

Conséquence concrète : à la fin de n'importe quelle tranche, on peut **ouvrir le navigateur et montrer quelque chose qui marche**. Si une tranche ne produit rien de démontrable, elle est mal découpée.

### 2. Walking skeleton (Cockburn)

La tranche `02` implémente le **fil le plus mince possible** qui traverse toute l'architecture : une page → un Route Handler → un service → un repository → Prisma → PostgreSQL, avec un test à chaque niveau et un test E2E par-dessus.

Ce squelette ne fait presque rien fonctionnellement. Son rôle est de **prouver que la plomberie tient** avant qu'on empile la moindre fonctionnalité. Tout ce qui vient après se contente d'épaissir ce squelette.

### 3. Ordonnancement par dépendance réelle

Une tranche n'arrive qu'après ce dont elle a **techniquement** besoin — pas après ce qui « semble logique ». L'authentification (`04`) précède le modèle premium (`05`) parce que l'entitlement a besoin d'une session. L'inscription aux jeux (`09`) précède le tunnel premium (`10`) parce qu'elle est la seule à valider le chemin d'écriture.

Chaque fichier ouvre par une section **« Pourquoi ici »** qui justifie sa position. Si la justification ne tient pas, la tranche peut être déplacée.

### 4. Ordonnancement par risque

À dépendance égale, **ce qui est le plus risqué passe en premier**. Trois risques dominent ce projet :

| Risque | Traité en | Pourquoi tôt |
|---|---|---|
| Fuite de contenu premium | `05` | C'est la règle métier qui justifie le produit. Une fuite découverte en recette signifie réécrire tous les repositories. |
| Socle de sécurité rétrofité | `03` | Poser une CSP stricte après avoir écrit 40 composants coûte dix fois plus cher qu'avant. |
| Format des ressources éditoriales inconnu | contrat posé en `07`, exécuté en `11` | Le contenu vient de l'extérieur du code. On fige le contrat tôt pour pouvoir produire le contenu en parallèle du développement. |

**Exception assumée au slicing vertical :** la tranche `03` est un socle transverse, pas une tranche verticale. Elle ne livre pas de capacité utilisateur. Elle est placée là **par arbitrage de risque**, en connaissance de cause — c'est la seule entorse de la pipeline.

### 5. Patron validé, puis réplication

La rubrique **Prompts** est construite intégralement en `07` et devient le **patron de référence** : structure de fichiers, découpage des DTO, jeu de tests, états d'écran.

Les rubriques **Formations** et **Opportunités** (`08`) sont ensuite des réplications quasi mécaniques de ce patron. Elles doivent aller nettement plus vite. **Si l'une d'elles ne rentre pas dans le patron, on ne bifurque pas en silence** : on met à jour le patron, et on répercute. Deux façons de faire la même chose dans le projet, c'est un défaut, pas une adaptation.

Les **Jeux & concours** (`09`) sont volontairement sortis de la réplication : ils portent un chemin d'écriture (l'inscription) que les trois autres rubriques n'ont pas.

### 6. Une DoD identique pour toutes les tranches

La même barre, partout, sans négociation en cours de route. Elle est définie ci-dessous et **référencée** par chaque fichier ; les fichiers n'ajoutent que leurs critères spécifiques.

---

## Definition of Done commune

Une tranche est terminée quand **tous** ces points sont vrais. Aucun n'est optionnel, aucun ne se reporte « à la tranche suivante ».

### Fonctionnel
- [ ] Le livrable annoncé dans la tranche est **démontrable dans un navigateur**, sur un viewport 390px.
- [ ] Les quatre états sont traités sur chaque écran touché : `loading` · `error` · `empty` · `success`.
- [ ] **Non-régression** : tous les parcours des tranches précédentes fonctionnent encore.

### Qualité de code
- [ ] `npm run lint && npm run type-check && npm run test && npm run build` — tout au vert.
- [ ] Aucun `any`, aucun `@ts-ignore` non commenté, aucun `console.log`, aucun style inline.
- [ ] Aucune variable `NEXT_PUBLIC_` ajoutée sans justification écrite.
- [ ] Aucun fichier au-delà de 300 lignes sans raison ; aucun au-delà de 800 lignes.
- [ ] Les couches sont respectées : pas de Prisma dans un Route Handler, pas de `NextResponse` dans un service, pas d'import de `src/server/` depuis un composant client.

### Tests
- [ ] Test unitaire du service (logique métier et cas limites).
- [ ] Test du repository sur une **vraie base** — pas de mock Prisma.
- [ ] Test d'intégration du Route Handler : chemin nominal + codes d'erreur.
- [ ] **Si la tranche touche du contenu gated** : test d'accès asserté sur le **JSON brut** de la réponse — un utilisateur anonyme et un utilisateur `FREE` ne reçoivent jamais le champ verrouillé.
- [ ] **Si la tranche touche une ressource utilisateur** : test d'isolation cross-user.

### Sécurité
- [ ] Toute entrée validée par un schéma Zod `.strict()`.
- [ ] `userId` issu de la session, jamais du body ni d'un query param.
- [ ] Aucun secret en dur, y compris dans les tests et les seeds.
- [ ] `npm audit` sans nouvelle vulnérabilité `high` ou `critical`.

### Reproductibilité
- [ ] Depuis un clone frais : `npm install` → `docker compose up -d postgres` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev` **fonctionne sans étape manuelle non documentée**.
- [ ] Toute nouvelle variable d'environnement est dans `.env.example` et validée par `src/server/config.ts`.

### Documentation
- [ ] Si une règle d'architecture ou de sécurité a changé : [AGENTS.md](../../AGENTS.md) est mis à jour dans la même PR.
- [ ] Commits au format Conventional Commits, scopes conformes à AGENTS.md.

---

## Invariant de tranche

> **À la fin de chaque tranche, l'application démarre, se navigue et passe la CI.**

Il n'existe pas d'état « en cours de refonte » entre deux tranches. Si une tranche impose de casser l'existant, elle inclut la remise en état — ce n'est pas un travail à part.

---

## Vue d'ensemble

| # | Tranche | Nature | Livrable démontrable |
|---|---|---|---|
| [01](01-fondations-et-outillage.md) | Fondations et outillage | Socle | Le projet démarre, la CI est verte |
| [02](02-walking-skeleton.md) | Walking skeleton | Verticale minimale | Une liste lue en base s'affiche à l'écran |
| [03](03-socle-securite.md) | Socle de sécurité transverse | Socle *(exception)* | Headers, rate limiting et erreurs propres, vérifiés par des tests |
| [04](04-authentification-et-compte.md) | Authentification et compte | Verticale | On s'inscrit, on se connecte, on voit son compte |
| [05](05-modele-acces-premium.md) | Modèle d'accès premium | Verticale — **risque max** | Un contenu premium est réellement verrouillé côté serveur |
| [06](06-shell-et-identite.md) | Shell du site et identité | Verticale — cadre | Le site devient un site : accueil, navigation, footer, pages institutionnelles |
| [07](07-tranche-reference-prompts.md) | Tranche de référence : Prompts | Verticale complète | La rubrique Prompts est finie ; le patron est figé |
| [08](08-replication-formations-opportunites.md) | Réplication : Formations, Opportunités | Réplication | Deux rubriques de plus, au même niveau |
| [09](09-jeux-et-inscriptions.md) | Jeux & concours et inscriptions | Verticale — chemin d'écriture | On s'inscrit à un concours |
| [10](10-tunnel-premium-mockup.md) | Tunnel premium (mockup) | Verticale | Le parcours d'achat se déroule visuellement, sans paiement |
| [11](11-enrichissement-ressources.md) | Enrichissement depuis `ressources/` | Industrialisation | La plateforme tourne avec le vrai contenu |
| [12](12-recette-v1.md) | Recette v1 | Validation | La v1 est déclarée finie, preuves à l'appui |

---

## Ce que vous devez fournir, et quand

Le développement dépend de deux apports extérieurs. Ils sont signalés ici pour être préparés **en parallèle**, pas au dernier moment.

| Quoi | Attendu pour | Détail |
|---|---|---|
| **Charte graphique** — logo, couleurs, typographie | avant la tranche `06` | Si elle existe, la fournir avant. En inventer une puis la remplacer coûte un restylage complet du site. |
| **Textes des pages institutionnelles et légales** — à propos, contact, mentions légales, confidentialité, CGU | tranche `06` | Un gabarit peut être proposé, mais le texte doit être **relu et assumé** par vous. Une politique de confidentialité inventée engage sur des pratiques qui ne sont pas les vôtres. |
| **Le contenu éditorial** dans `ressources/`, images comprises | tranche `11` | Le **format** est figé en tranche `07` — commencez à écrire dès que `07` est terminée, sans attendre `11`. Sinon la rédaction devient le chemin critique du projet. |
| Les décisions produit ouvertes | au fil de l'eau | Chaque fichier se termine par une section **« À trancher »**. Ce sont des questions dont la réponse change le code. |

*Dernière mise à jour : 2026-08-07*
