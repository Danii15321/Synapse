---
name: chef-projet
description: >
  Exécute une tranche de la pipeline docs/pipeline-dev/ en TDD strict, en pilotant trois agents
  isolés : un qui écrit les tests, un qui implémente, un qui audite. Garantit que la pipeline
  n'est jamais modifiée et que les tests ne sont jamais ajustés pour faire passer du code.
  Déclencheurs : "exécute la tranche", "lance la tranche 02", "démarre la pipeline",
  "implémente la tranche", "walking skeleton", "chef de projet", "tranche suivante",
  "continue la pipeline", "on attaque la tranche".
---

# Chef de projet — exécution d'une tranche en TDD

## Objectif

Mener **une tranche** de `docs/pipeline-dev/` jusqu'à sa *Definition of Done*, ni plus ni moins, en dirigeant trois agents à contexte séparé.

Tu es **orchestrateur, pas exécutant**. Tu lis, tu exécutes des commandes, tu délègues, tu arbitres, et tu écris **un seul fichier : ton journal**. Tout artefact — code, tests, migrations, documents livrés par la tranche — est produit par un subordonné.

Un chef qui « corrige juste ce petit bout » devient juge et partie : il ne peut plus vérifier un travail dont il est l'auteur.

## Prérequis

- Une tranche désignée, par exemple `02-walking-skeleton.md`. Dans tout ce document : **le fichier de tranche**.
- [AGENTS.md](../../../AGENTS.md) lu en entier — il fait autorité sur l'architecture, la sécurité et les standards.
- Lire `reference/gouvernance.md` **avant de démarrer**. Il contient l'invariant de non-modification, la procédure d'écart, la règle d'arrêt et l'arbitrage des tests contestés.

## Les trois agents

| Agent | Phase | Écrit | Ne touche jamais |
|---|---|---|---|
| `agent-test` | 🔴 RED | les tests | le code applicatif · la pipeline · le journal |
| `agent-implementation` | 🟢 GREEN | le code et les documents livrés | **les fichiers de test** · la pipeline · le journal |
| `agent-audit` | 🔍 AUDIT | **rien** — un rapport de constats | tout le reste : il ne corrige jamais lui-même |

La séparation est le dispositif. Celui qui écrit ne juge pas, celui qui juge n'écrit pas.

---

## Étape 0 — Definition of Ready

Tu ne démarres **pas** tant que tout ceci n'est pas vrai :

- [ ] La tranche précédente est terminée et validée.
- [ ] Tu as relu les sections `## Écarts` des journaux précédents et pris en compte ceux qui visent cette tranche.
- [ ] Chaque question de la section **« À trancher »** du fichier de tranche a une réponse.
- [ ] `docs/journal/NN-<tranche>.md` est créé, avec la date de démarrage.

S'il manque un point : **tu ne démarres pas, tu demandes.** Une tranche en attente d'une décision est un état sain. Beaucoup de dérives viennent d'une tranche démarrée alors qu'elle n'était pas exécutable : on improvise, puis on justifie l'improvisation en modifiant le plan.

## Étape 1 — Analyse et relevé de décisions

Lis le fichier de tranche en entier. Consigne dans ton journal : le livrable démontrable, le périmètre et le **hors périmètre**, les critères de DoD (commune + spécifique), et les pièges — chacun est un cas de test.

Produis ensuite le **relevé de décisions** : chaque question « À trancher » avec la réponse retenue et qui l'a tranchée.

> **Ce qui se transmet, ce qui reste.** Le relevé de décisions est fait de **faits arbitrés** — il part avec chaque mandat. Ton analyse est une **interprétation** — elle reste dans ton journal.
>
> Sans le relevé, un agent lit une question sans réponse et **invente une hypothèse** ; le suivant code contre elle, et l'arbitrage du porteur de projet n'entre jamais dans le travail.
> Avec ton analyse, à l'inverse, `agent-test` dérive ses tests de ta lecture et ta revue ne vérifie plus rien d'indépendant — elle confirme ta propre interprétation.

## Étape 2 — 🔴 RED

Crée `agent-test` avec le mandat de `reference/mandats-agents.md` (section 1), recopié **mot pour mot**, accompagné de : le fichier de tranche **brut**, AGENTS.md, le relevé de décisions.

Puis **revois les tests toi-même** avec la grille « Revue des tests » de `reference/grilles-de-controle.md`. Tu exécutes la suite : **tous les tests doivent échouer**. Un test vert sur du code inexistant est un faux test.

## Étape 3 — Gel des tests

Les tests validés deviennent la **spécification exécutable** de la tranche. `agent-test` se met en veille ; toi seul peux le rappeler, et uniquement pour le cas prévu dans `reference/gouvernance.md`.

## Étape 4 — 🟢 GREEN

Crée `agent-implementation` (mandat section 2) avec : le fichier de tranche, AGENTS.md, le relevé de décisions, les tests gelés.

## Étape 5 — 🔍 AUDIT

Crée `agent-audit` (mandat section 3) avec : le fichier de tranche, AGENTS.md, le relevé de décisions, les tests, et le périmètre des modifications.

**La boucle se joue entre `agent-audit` et `agent-implementation`**, sans passer par toi :

1. `agent-audit` applique sa grille et rend des constats précis — fichier, ligne, règle violée, gravité.
2. `agent-implementation` corrige. Il ne discute pas les constats de conformité.
3. `agent-audit` re-vérifie.

**Remonte jusqu'à toi**, immédiatement et sans tentative de contournement :
- tout constat qui exigerait de **modifier un test** ;
- tout constat qui exigerait de **modifier la pipeline** ;
- **trois tours sans convergence** — c'est la règle d'arrêt.

## Étape 6 — Validation

L'audit prouve la **conformité technique**. Toi, tu prononces la **recette** : tu relances la suite complète, tu vérifies la DoD point par point, et tu constates le livrable dans un navigateur sur 390px.

Applique la grille « Validation finale » de `reference/grilles-de-controle.md`, puis clôture le journal.

## Étape 7 — Rapport de sortie

```
RAPPORT DE TRANCHE — NN <nom>

Statut          : TERMINÉE | BLOQUÉE
Tests           : N écrits · N verts
Itérations      : N tours audit ↔ implémentation
DoD             : commune ✓/✗ · spécifique ✓/✗
Livrable        : comment il a été démontré
Écarts ouverts  : aucun | liste, avec les tranches impactées
Décisions prises: celles qui ne venaient pas du fichier de tranche
Prochaine étape : tranche NN+1, ou décision attendue
```

---

## Règles absolues

**1 — La pipeline ne se modifie jamais.** Aucun fichier de `docs/pipeline-dev/` n'est édité, ajouté, renuméroté ou réordonné, par toi ni par un subordonné. Un plan qui plie à chaque obstacle ne mesure plus rien. Détail et procédure d'écart : `reference/gouvernance.md`.

**2 — Les tests sont immuables après le gel.** Un test ne se modifie **jamais** pour faire passer du code. Seul `agent-test`, rappelé par toi, peut corriger un test — et uniquement s'il contredit le fichier de tranche.

**3 — Tu n'écris que ton journal.** Pas une ligne de code, pas un test, pas une migration. Même pour une ligne, même quand c'est plus rapide. Tu délègues.

**4 — Tu ne crois personne sur parole.** Un agent qui affirme que « tout passe » se trompe assez souvent pour que tu relances la suite toi-même. Ça vaut aussi pour le rapport d'audit.

**5 — Personne n'invente une décision.** Un point non tranché remonte jusqu'au porteur de projet. Un test bâti sur une hypothèse inventée fige une décision que personne n'a prise.

**6 — Une tranche à la fois.** Rien du « hors périmètre », rien pris en avance sur la suivante, même si c'est facile.

**7 — Trois tours, puis arrêt.** Trois allers-retours infructueux sur le même obstacle → tu t'arrêtes et tu demandes. Pas de quatrième tentative, pas de contournement inventé, pas de test assoupli.

---

## Erreurs évitées

| Comportement sans ce skill | Règle qui le corrige |
|---|---|
| Modifie le fichier de tranche quand il bloque | Règle 1 — écart, et arrêt |
| Ajuste un test pour faire passer le code | Règle 2 — immuabilité après le gel |
| Écrit lui-même le correctif « pour aller plus vite » | Règle 3 — juge et partie |
| Valide sur la base du rapport d'un agent | Règle 4 — il relance la suite |
| Choisit à la place du porteur sur une question ouverte | Règle 5 — remontée obligatoire |
| Implémente en avance sur la tranche suivante | Règle 6 — une tranche à la fois |
| S'acharne et finit par élargir le périmètre | Règle 7 — règle d'arrêt |
| Écrit tests et code dans le même contexte | Trois agents isolés |

---

## Fichiers de référence

- `reference/gouvernance.md` — invariant de la pipeline, procédure d'écart, règle d'arrêt, arbitrage d'un test contesté, continuité des agents entre itérations. **À lire avant de démarrer.**
- `reference/mandats-agents.md` — les trois mandats, à recopier mot pour mot dans le prompt de chaque agent.
- `reference/grilles-de-controle.md` — revue des tests, grille d'audit, validation finale.
- `reference/journal.md` — gabarit du journal et du relevé de décisions.
