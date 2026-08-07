# Grilles de contrôle

Trois grilles, trois moments, trois responsables. Elles ne se recouvrent pas : chacune attrape ce que les autres ne peuvent pas voir.

| Grille | Quand | Qui l'applique |
|---|---|---|
| §1 Revue des tests | après la phase RED, **avant le gel** | le chef-projet |
| §2 Audit de conformité | après chaque passe d'implémentation | `agent-audit` |
| §3 Validation finale | une fois l'audit propre | le chef-projet |

---

## 1. Revue des tests — avant le gel

C'est le seul moment où un test peut encore changer sans cérémonie. Sois exigeant ici : tout ce qui passe maintenant devient la spécification pour le reste de la tranche.

- [ ] Chaque case de la **DoD spécifique** a **au moins un** test correspondant.
- [ ] Chaque ligne applicable de la **DoD commune** est couverte.
- [ ] Le **livrable démontrable** a son test E2E.
- [ ] Chaque ligne du tableau **« Pièges »** a son test de non-régression.
- [ ] **Tous les tests échouent** — tu lances la suite toi-même. Un test vert à ce stade est un test à réécrire : il n'assert rien, ou il teste le framework.
- [ ] **Aucun code applicatif ni stub** n'a été écrit par `agent-test`.
- [ ] **Aucun test ne repose sur une hypothèse inventée** : tout ce qu'un test présuppose est soit dans le fichier de tranche, soit dans le relevé de décisions. C'est le contrôle qui rattrape une question « À trancher » mal arbitrée.
- [ ] Les quatre niveaux sont présents ; le test de repository tourne sur une **vraie base PostgreSQL**.
- [ ] Si la tranche touche du contenu premium : assertion sur le **JSON brut** *et* sur le **HTML servi**.
- [ ] Si la tranche touche une ressource utilisateur : test d'**isolation cross-user**.
- [ ] Aucun test hors périmètre.
- [ ] Les noms de tests décrivent un comportement, pas une fonction.

---

## 2. Audit de conformité — `agent-audit`

### Tests et chaîne de qualité

- [ ] Toute la suite passe — **relancée par l'auditeur**, pas lue dans un rapport.
- [ ] `npm run lint && npm run type-check && npm run test && npm run build` au vert.
- [ ] **Aucun fichier de test modifié depuis le gel.** Dès que le dépôt Git existe : `git diff` sur les fichiers de test. Avant : comparaison avec les contenus validés à l'étape de gel.
- [ ] **Aucun fichier de `docs/pipeline-dev/` modifié.**

### Périmètre

- [ ] Rien de ce que le fichier de tranche classe en **« Hors périmètre »** n'a été implémenté.
- [ ] Rien n'a été pris en avance sur la tranche suivante.
- [ ] Chaque fichier touché se rattache à un test ou à une exigence explicite de la tranche.

### Architecture — AGENTS.md

- [ ] Couches respectées : pas de Prisma dans un Route Handler, pas de `NextResponse` dans un service, pas de règle métier dans un repository.
- [ ] `import "server-only"` en tête de chaque fichier sous `src/server/`.
- [ ] Aucun import de `src/server/` depuis un composant client.
- [ ] `select` Prisma **explicite** partout — aucun `findMany()` nu, aucune liste non bornée.
- [ ] Zod `.strict()` sur toutes les entrées.
- [ ] `userId` issu de la session, jamais du body ni d'un query param.
- [ ] Aucun `any`, aucun `@ts-ignore` non commenté, aucun `console.log`, aucun style inline.
- [ ] Aucune variable `NEXT_PUBLIC_` ajoutée sans justification.
- [ ] Aucun fichier au-delà de 300 lignes sans raison ; aucun au-delà de 800.

### Sécurité — ce qui ne se voit pas à l'écran

- [ ] Un champ verrouillé n'apparaît **ni dans le JSON brut, ni dans le HTML servi, ni dans le payload RSC**, pour un anonyme comme pour un membre `FREE`.
- [ ] Le champ verrouillé n'est **pas chargé depuis la base** quand l'utilisateur n'y a pas droit — vérifier le `select`, pas seulement la réponse.
- [ ] Isolation cross-user : aucune ressource d'un utilisateur n'est lisible ou modifiable par un autre.
- [ ] Aucun secret en dur, y compris dans les tests et les seeds.
- [ ] Aucune stack trace ni message Prisma dans une réponse d'erreur.
- [ ] `npm audit` sans nouvelle vulnérabilité `high` ou `critical`.

### Reproductibilité

- [ ] Depuis un clone frais : `npm install` → `docker compose up -d postgres` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev` fonctionne **sans étape manuelle non documentée**.
- [ ] Toute nouvelle variable d'environnement est dans `.env.example` et validée par `src/server/config.ts`.

---

## 3. Validation finale — le chef-projet

L'audit prouve la **conformité**. Tu prononces la **recette** : ce que seule une personne qui regarde le produit peut constater.

- [ ] Toute la suite passe — **relancée par toi**, y compris après un rapport d'audit favorable.
- [ ] DoD commune **et** DoD spécifique satisfaites, point par point.
- [ ] Le **livrable démontrable** existe dans un navigateur, sur un viewport **390px**.
- [ ] Les quatre états sont traités sur chaque écran touché : `loading` · `error` · `empty` · `success`.
- [ ] **Non-régression** : les parcours des tranches précédentes fonctionnent encore.
- [ ] Le rapport d'audit est joint au journal, sans constat `BLOQUANT` ni `MAJEUR` ouvert.
- [ ] Le journal est à jour : analyse, relevé de décisions, itérations, décisions d'implémentation, écarts.
- [ ] Les écarts ouverts nomment les tranches qu'ils impactent.
- [ ] Commits au format Conventional Commits, scopes conformes à AGENTS.md.
