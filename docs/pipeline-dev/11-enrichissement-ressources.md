# 11 — Enrichissement depuis `ressources/`

> **Nature :** industrialisation · **Dépend de :** `07`, `08`, `09` — et **de votre contenu** · **Prépare :** `12`

---

## Objectif

Remplacer les données de démonstration par le **vrai contenu éditorial**, importé depuis `ressources/` de façon validée, rejouable et vérifiable.

## Pourquoi ici

Dépendance double, et c'est ce qui rend cette tranche particulière :

- **Technique** : les quatre rubriques doivent exister, avec leur modèle figé. Importer avant reviendrait à retaper le contenu à chaque changement de schéma.
- **Humaine** : le contenu doit être écrit. C'est la seule tranche dont l'entrée ne vient pas du code.

C'est pourquoi les **contrats de ressources sont posés dès la tranche `07`** — pour que la rédaction se fasse en parallèle du développement des tranches `08` à `10`, et non après. Si vous attendez cette tranche pour commencer à écrire, elle devient le chemin critique du projet.

---

## Contenu

### Organisation attendue

```
ressources/
├── prompts/
│   ├── README.md        contrat de format, posé en tranche 07
│   ├── images/          visuels de couverture, facultatifs
│   └── *.md             un fichier par prompt
├── formations/          idem
├── jeux/                idem — l'affiche compte particulierement, voir tranche 09
└── opportunites/        idem
```

Les images suivent la convention média posée en tranche `06` : ratio unique, dimensions raisonnables. L'import les copie vers `public/` et renseigne `coverImage`. Un contenu sans image reçoit le visuel de repli — ce n'est pas une erreur d'import.

`ressources/` n'est **pas** du code. Selon la sensibilité du contenu, il peut être versionné ou tenu hors dépôt — voir « À trancher ».

### Le seed industrialisé

Le `prisma/seed.ts` embryonnaire de la tranche `02` devient un vrai importateur :

1. **Lecture** de tous les fichiers de `ressources/`, par rubrique.
2. **Validation Zod de chaque fichier**, avec le schéma de sa rubrique. Un fichier invalide provoque une erreur qui nomme **le fichier et le champ** — pas un `undefined` cent lignes plus loin.
3. **Normalisation** : slugs sans accents, tags en minuscules, dates en ISO, `visibility` explicite.
4. **Upsert sur le `slug`** — l'import est rejouable sans dupliquer et sert aussi de mise à jour.
5. **Rapport final** : nombre d'éléments importés, mis à jour, rejetés — **avec le motif de chaque rejet**.

### Le contenu est une entrée non fiable

C'est le point de sécurité de cette tranche, et il est contre-intuitif : le contenu vient de vous, donc la tentation est de lui faire confiance. Il ne faut pas.

- Le Markdown est rendu **sans HTML inline**, ou assaini. Un fichier de contenu peut contenir un `<script>`, par erreur ou par copier-coller depuis une page web.
- Les liens externes (`externalUrl` des opportunités) sont validés comme URL, en `https` uniquement, et rendus avec `rel="noopener noreferrer"`.
- Les longueurs maximales sont vérifiées à l'import : un `summary` de 4 000 caractères casse toutes les cartes de la liste.

### Vérification à volume réel

C'est la première fois que le projet voit du contenu réel. Deux choses ne se voient qu'ici :

- **La performance** — pagination, index, poids des pages avec le vrai nombre d'éléments.
- **Le rendu** — un titre de 90 caractères, un résumé de trois lignes, un prompt de 200 lignes. Les données de démonstration sont toujours trop bien calibrées. Prévoir de retoucher des composants, ce n'est pas un échec de conception.

### Cohérence du gating

À l'import, chaque élément reçoit sa `visibility`. Après l'import : **vérifier la répartition réelle** entre `FREE` et `PREMIUM`, rubrique par rubrique. C'est le moment où une erreur de masse se détecte — un `visibility` absent du frontmatter qui retombe sur le défaut `FREE` publierait gratuitement tout le catalogue premium.

Faire de ce contrôle une **sortie du rapport d'import**, pas une inspection manuelle.

---

## Livrable démontrable

`npx prisma db seed` sur une base vide charge l'intégralité du contenu réel et affiche son rapport. La plateforme se navigue avec le vrai contenu, sur 390px, en connexion bridée. Le rapport confirme la répartition gratuit/premium attendue.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Un fichier de ressource invalide fait **échouer l'import** avec un message nommant le fichier et le champ fautif.
- [ ] L'import est **rejouable** : deux exécutions consécutives donnent le même état de base.
- [ ] Un import modifiant un fichier existant **met à jour** l'élément au lieu d'en créer un second.
- [ ] Test : un fichier contenant du HTML malveillant n'aboutit à aucune exécution de script dans la page rendue.
- [ ] Le rapport d'import affiche la répartition `FREE` / `PREMIUM` par rubrique.
- [ ] Les écrans tiennent avec les contenus réels les plus longs et les plus courts.
- [ ] Aucune donnée de démonstration ne subsiste en base après l'import.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Import sans validation | Données incohérentes en base, bugs d'affichage inexplicables | Zod sur chaque fichier, échec bruyant |
| `create` au lieu d'`upsert` | Doublons à la moindre réexécution | `upsert` sur le `slug`, dès l'origine |
| `visibility` omis dans le frontmatter | Tout le catalogue premium publié gratuitement | Champ **obligatoire** dans le schéma Zod, jamais de valeur par défaut à l'import |
| Markdown rendu tel quel | Injection HTML depuis un fichier de contenu | Rendu sans HTML inline, ou assainissement |
| Slugs générés avec accents ou espaces | URL cassées, doublons invisibles | Normalisation à l'import, unicité vérifiée |
| Découvrir le volume réel en recette | Listes lentes, mise en page qui déborde | Vérification de performance et de rendu **dans cette tranche** |
| Contenu écrit après cette tranche | La v1 attend le contenu, pas le code | Rédaction lancée dès la fin de `07` |

---

## À trancher

- **`ressources/` est-il versionné dans Git ?** Recommandation : oui si le contenu premium n'est pas confidentiel — c'est plus simple et l'historique est utile. Sinon, dossier hors dépôt et procédure d'import documentée. **Attention** : si le dépôt devient public un jour, tout le contenu premium devient public avec lui. À décider en connaissance de cause.
- **Qui met à jour le contenu après la v1 ?** Réimport par un développeur (retenu ici), ou interface d'administration (v2) ? Ça ne change rien à cette tranche, mais ça change le confort ensuite.
- **Volume attendu par rubrique ?** Utile pour dimensionner la pagination et savoir si `ILIKE` suffit ou s'il faut une vraie recherche full-text.
