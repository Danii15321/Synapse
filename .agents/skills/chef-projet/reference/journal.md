# Le journal — `docs/journal/NN-<tranche>.md`

C'est le **seul fichier que le chef-projet écrit**. Il est créé au démarrage de la tranche et clôturé à la validation.

Il vit dans `docs/journal/`, versionné avec le projet, à côté de la pipeline qu'il exécute : dans six mois, `docs/pipeline-dev/` dira ce qui était **prévu** et `docs/journal/` dira ce qui a **eu lieu**. C'est aussi ce qui évite que l'un finisse écrit dans l'autre.

---

## Gabarit

```markdown
# Journal — tranche NN : <nom>

- Démarrée le : / Terminée le : / Statut : EN COURS | BLOQUÉE | TERMINÉE

## Definition of Ready
Tranche précédente validée : oui/non.
Écarts des journaux précédents pris en compte : lesquels.

### Relevé de décisions — transmis aux trois agents
| Question « À trancher » | Réponse retenue | Tranchée par |
|---|---|---|

Toute question apparue en cours de tranche vient s'inscrire ici, jamais dans un test
ni dans le code.

## Analyse — reste ici, n'est transmise à personne
Livrable démontrable · périmètre · hors périmètre · critères de DoD ·
pièges retenus comme cas de test.

## Tests
Liste des tests, point du fichier de tranche dont chacun dérive, date du gel.

## Itérations audit ↔ implémentation
| # | Constats renvoyés | Ce qui a été corrigé |

## Décisions d'implémentation
Les choix que le plan ne dictait pas, et leur raison.
Ce qu'on regretterait de ne pas pouvoir expliquer dans trois mois.

## Écarts
Constat factuel · en quoi la tranche est infaisable telle qu'écrite · proposition ·
**tranches suivantes impactées, nommées** · ce qui a été tenté · décision humaine.

## Validation finale
Grille cochée · rapport d'audit · comment le livrable a été démontré, et à qui.
```

---

## Ce qui va où

| Situation | Section |
|---|---|
| Le porteur a tranché une question ouverte | **Relevé de décisions** — et ça part avec chaque mandat |
| Ta lecture du fichier de tranche | **Analyse** — et ça ne part nulle part |
| Un contournement technique, du temps perdu, un piège rencontré | **Décisions d'implémentation** |
| Le plan est infaisable tel qu'écrit | **Écarts** — puis tu t'arrêtes |
| Trois tentatives infructueuses | **Écarts**, avec les trois tentatives détaillées |

La règle de tri est simple : si le plan reste exécutable, c'est du journal ; s'il ne l'est plus, c'est un écart et le travail s'arrête.
