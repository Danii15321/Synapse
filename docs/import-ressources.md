# Approvisionner et importer les ressources éditoriales

Le contenu éditorial est volontairement **hors Git**. Le dossier `ressources/`
est ignoré dans son intégralité afin qu'un dépôt rendu public ne publie jamais
les corps premium. Un clone frais ne contient donc aucun prompt réel.

## Approvisionnement

Récupérer l'archive éditoriale depuis le canal privé retenu par Synapse, puis
la copier à la racine du projet en conservant exactement cette casse et cette
structure :

```text
ressources/
└── PROMPTS/
    ├── BUSINESS/
    ├── ETUDES/
    ├── MANGA/
    ├── MARKETING DIGITAL/
    ├── RESEAUX SOCIAUX/
    └── VIE PRO/
```

Seuls les fichiers Markdown sous `ressources/PROMPTS/` sont importés. Le
dossier historique `ressources/prompts/` et les autres rubriques éditoriales
locales ne sont pas des sources du seed v1. Ne jamais forcer leur ajout dans
Git et ne jamais recopier un corps réel dans une fixture de test.

Chaque fichier doit contenir un titre `##`, une ligne `Modèle Cible :` et un
marqueur `### Prompt :` suivi du corps complet. Les fichiers sont traités comme
des entrées non fiables : leur structure et leurs longueurs sont validées avant
toute écriture.

## Import et réimport

Avec PostgreSQL démarré et `DATABASE_URL` configurée, exécuter :

```bash
npx prisma db seed
```

Le seed synchronise le catalogue sur le slug. Une première exécution compte
les lignes comme **importées** ; une nouvelle exécution du même catalogue les
compte comme **mises à jour**, sans changer leurs identifiants ni créer de
doublons. Les prompts absents de la source et toutes les anciennes données de
démonstration Formations, Opportunités et Jeux sont supprimés.

Une ressource invalide arrête l'opération avant la synchronisation. Le rapport
affiche **rejetés** et le motif précis, avec le fichier et le champ fautif. Il
faut corriger la ressource source puis relancer la même commande.

Le rapport final présente aussi la répartition `FREE` / `PREMIUM` par rubrique.
Pour les 69 prompts actuels, le résultat attendu est 20 `FREE` et 49
`PREMIUM`; Formations, Opportunités et Jeux restent à 0 / 0. Les 20 contenus
gratuits sont sélectionnés de façon stable selon les quotas suivants :

| Dossier           | FREE |
| ----------------- | ---: |
| BUSINESS          |    9 |
| ETUDES            |    3 |
| MANGA             |    1 |
| MARKETING DIGITAL |    1 |
| RESEAUX SOCIAUX   |    2 |
| VIE PRO           |    4 |

Après la v1, les mises à jour éditoriales passeront par une future interface
d'administration. Cette interface ne fait pas partie de l'import v1.

## Intégration continue

Un clone CI ne contient jamais `ressources/`. Le job GitHub Actions exécute
`npm run ci:resources` avant le seed : cette commande génère temporairement les
69 fixtures synthétiques réservées aux tests sous `ressources/PROMPTS/`, puis
`npx prisma db seed` les importe. Le dossier reste ignoré et disparaît avec le
runner ; aucun corps éditorial réel ni fichier généré n'est ajouté au dépôt.

La commande refuse de fonctionner hors CI et refuse d'écraser un dossier
`ressources/PROMPTS` existant. Elle n'utilise ni secret ni variable publique.
