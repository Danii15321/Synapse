# 09 — Jeux & concours et inscriptions

> **Nature :** tranche verticale — **premier chemin d'écriture** · **Dépend de :** `08` · **Prépare :** `11`

---

## Objectif

Livrer la quatrième rubrique, et avec elle la seule **écriture utilisateur** de la v1 : l'inscription à un jeu ou un concours.

## Pourquoi ici

Sortie de la réplication (`08`) à dessein : les trois autres rubriques sont en lecture seule, celle-ci porte une mutation. Une mutation apporte des problèmes que la lecture ignore — idempotence, concurrence, unicité, fermeture des inscriptions, isolation entre utilisateurs.

Elle vient **après** les trois rubriques en lecture parce qu'elle en réutilise toute la partie présentation, et **avant** le tunnel premium (`10`) parce qu'elle valide le chemin d'écriture que `10` mettra en scène — sans jamais l'exécuter.

**Rappel de périmètre :** le jeu ou le concours se déroule **ailleurs** — en présentiel ou hors plateforme. Le site présente et enregistre. Rien d'autre. Toute demande de suivi de partie, de classement ou de résultat sort de la v1.

---

## Contenu

### Modèle

```prisma
model Jeu {
  id            String     @id @default(cuid())
  slug          String     @unique
  title         String
  summary       String
  excerpt       String?
  body          String     // règles complètes — champ verrouillé si premium
  visibility    Visibility @default(FREE)
  startsAt      DateTime?  // début de l'activité
  closesAt      DateTime?  // clôture des inscriptions
  capacity      Int?       // places, si limitées
  location      String?    // présentiel : lieu
  coverImage    String?    // affiche du concours — voir remarque ci-dessous
  publishedAt   DateTime?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  inscriptions  Inscription[]
}

model Inscription {
  id        String   @id @default(cuid())
  userId    String
  jeuId     String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  jeu  Jeu  @relation(fields: [jeuId], references: [id], onDelete: Cascade)

  @@unique([userId, jeuId])   // la garantie d'unicité vit en base, pas dans le code
  @@index([jeuId])
}
```

**L'affiche compte plus ici qu'ailleurs.** Un concours se vend par son visuel : c'est le contenu le plus proche d'une annonce, et il sera partagé sur WhatsApp avant d'être lu. Le champ `coverImage` suit la convention média posée en `06`, et le visuel de repli doit rester présentable — un concours sans affiche ne doit pas donner l'impression d'une page cassée.

La contrainte `@@unique([userId, jeuId])` est le point central. Une vérification applicative « l'utilisateur est-il déjà inscrit ? » suivie d'un `create` **est une condition de course** : deux taps rapides sur un mobile lent produisent deux inscriptions. La base doit trancher, le code doit rattraper la violation de contrainte.

### Règles d'inscription

Toutes vérifiées **côté serveur**, dans le service :

1. **Utilisateur connecté** — sinon redirection vers `/login` avec retour.
2. **Entitlement** — un concours `PREMIUM` n'accepte que les membres premium. Même `canAccess`, même point unique de vérité.
3. **Inscriptions ouvertes** — `closesAt` non dépassée, `publishedAt` non nul.
4. **Capacité** — si `capacity` est défini, refuser au-delà. Le comptage et l'insertion doivent être dans **une transaction**, sinon deux inscriptions simultanées passent la dernière place.
5. **Idempotence** — une seconde inscription au même jeu n'est pas une erreur pour l'utilisateur : elle renvoie l'état « déjà inscrit ». La violation de contrainte unique est **rattrapée**, pas propagée en 500.

### Écrans

- Liste et détail des jeux : réplication du patron `07`.
- Bouton d'inscription avec ses états : `non connecté` · `réservé aux membres premium` · `inscriptions closes` · `complet` · `déjà inscrit` · `inscription en cours` · `inscrit`.
- Confirmation claire après inscription : ce qui se passe ensuite, **où** et **quand** l'activité a lieu — c'est tout l'intérêt de la rubrique, l'activité étant hors plateforme.
- `(member)/compte` : liste « mes inscriptions », avec le détail de chaque activité.

### Isolation

Une inscription appartient à un utilisateur. Toute lecture ou écriture filtre sur le `userId` **issu de la session**. Jamais d'`inscriptionId` du client sans vérification de propriété.

---

## Hors périmètre

- Envoi d'e-mail de confirmation — aucun service d'e-mail en v1. **À signaler explicitement à l'écran** : l'utilisateur doit savoir qu'il ne recevra rien.
- Désinscription. Voir « À trancher ».
- Liste d'attente quand la capacité est atteinte.
- Export de la liste des inscrits — besoin réel côté organisateur, mais c'est de l'administration, donc v2. En attendant, une requête SQL directe suffit.

---

## Livrable démontrable

Un membre connecté ouvre un concours, s'inscrit, voit sa confirmation, retrouve l'inscription dans son compte. Un second tap ne crée pas de doublon. Un concours clos ou complet refuse l'inscription avec un message clair. Un concours premium refuse un membre `FREE`.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Test : double soumission → **une seule** inscription en base, réponse cohérente pour l'utilisateur.
- [ ] Test de concurrence : deux inscriptions simultanées sur la dernière place → une seule acceptée.
- [ ] Test : inscription refusée après `closesAt`.
- [ ] Test : inscription refusée pour un `FREE` sur un concours `PREMIUM`.
- [ ] Test d'isolation : un utilisateur ne peut ni voir ni manipuler l'inscription d'un autre.
- [ ] Test : la Server Action ou le handler d'inscription refuse un appel direct sans session.
- [ ] Rate limiting appliqué à la route d'inscription (régime sensible, tranche `03`).

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Vérifier l'existence puis insérer | Doublons sur double tap en réseau lent — cas très fréquent sur mobile | Contrainte unique en base, violation rattrapée |
| Compter les places hors transaction | La dernière place attribuée deux fois | Comptage + insertion dans `$transaction` |
| Bouton non désactivé pendant l'appel | Double soumission garantie sur 3G | `isPending` / `useFormStatus`, bouton désactivé |
| `jeuId` **et** `userId` pris du body | Inscription d'un autre utilisateur en modifiant une requête | `userId` **toujours** de la session |
| Violation de contrainte remontée en 500 | Message d'erreur incompréhensible sur un cas normal | Rattraper `P2002` et renvoyer « déjà inscrit » |
| Confirmation qui ne dit pas où ni quand | L'utilisateur inscrit ne se présente pas — la rubrique rate son but | Lieu, date et suite du parcours dans la confirmation |

---

## À trancher

- **Désinscription possible ?** Recommandation : oui, un simple `delete` filtré sur la session. C'est peu de travail et évite des listes d'inscrits fausses, ce qui coûte cher côté organisateur.
- **Champs demandés à l'inscription.** Le compte suffit-il, ou faut-il des informations complémentaires (téléphone, établissement, motivation) ? Cette réponse change le modèle `Inscription` — **à trancher avant de commencer la tranche**, pas pendant.
- **Comment l'organisateur récupère la liste des inscrits en v1 ?** Requête SQL manuelle assumée, ou export CSV minimal ? Recommandation : requête manuelle, l'export attendra un vrai besoin.
