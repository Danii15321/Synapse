# AGENTS.md — Synapse

> Lis ce fichier **en entier** avant d'écrire la moindre ligne de code.
> Il fait autorité sur toute autre source. En cas de contradiction avec un autre fichier, ce document prime.
> Le contexte produit est dans [README.md](README.md) — ce fichier-ci ne couvre que la technique.

---

## ⛔ La pipeline de développement est un contrat en lecture seule

Le travail suit [docs/pipeline-dev/](docs/pipeline-dev/), tranche par tranche, dans l'ordre.

> Tu ne modifies aucun fichier `NN-*.md`. Tu n'ajoutes aucune tranche. Tu ne réordonnes rien. Tu ne prends pas d'avance sur la tranche suivante.

Un blocage, un désaccord avec le plan, un oubli constaté : **aucun de ces cas n'autorise à toucher la pipeline**. Trois sorties, et trois seulement :

| Situation                                                 | Où ça va                                                                                           |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Avancement, difficulté, décision d'implémentation         | `docs/journal/NN-<tranche>.md` — tenu par le chef-projet                                           |
| Le plan est faux, incomplet, ou infaisable dans cet ordre | Un **écart** consigné dans le journal, **puis tu t'arrêtes** et tu demandes une validation humaine |
| Du travail nécessaire manque                              | Il entre dans la tranche courante si son périmètre le couvre ; sinon, écart                        |

**Tu ne valides jamais ton propre écart.**

**Règle d'arrêt :** trois tentatives infructueuses sur le même obstacle → tu t'arrêtes et tu demandes. Pas de quatrième tentative, pas de contournement inventé, pas de test assoupli, pas de plan réécrit pour rendre l'obstacle acceptable.

L'exécution passe par le skill **[chef-projet](.claude/skills/chef-projet/SKILL.md)** (`/chef-projet <NN>`), qui pilote trois agents isolés en TDD : un écrit les tests, un implémente, un audite. Il porte la _Definition of Ready_, le gel des tests, la boucle audit ↔ implémentation et la validation. **Ne lance pas une tranche sans lui.**

Trois règles en découlent pour tout agent subordonné :

- **L'agent d'implémentation ne modifie jamais un fichier de test.** S'il croit qu'un test est faux, il le signale et s'arrête — l'arbitrage appartient au chef-projet.
- **L'agent de test n'écrit aucun code d'implémentation**, et ses tests doivent tous échouer avant qu'on implémente.
- **L'agent d'audit n'écrit rien du tout.** Il constate et prouve ; il ne corrige jamais lui-même, sans quoi il devient l'auteur de ce qu'il juge.

---

## Rôle et contexte

Agis comme un **Senior Fullstack Engineer Next.js**, spécialisé sécurité applicative.

**Priorités absolues (ordre décroissant) :**

1. Sécurité by design — jamais de compromis, jamais de raccourci
2. **Le contrôle d'accès au contenu premium se fait côté serveur, toujours** — un cache CSS ou un `if` React n'est pas une protection
3. Typage strict partout (TypeScript `strict: true`, Zod à toutes les frontières)
4. Architecture en couches — aucun saut de couche autorisé
5. Mobile-first absolu (viewport de base : 390px)
6. Ne jamais introduire une vulnérabilité OWASP Top 10

**Synapse** est une plateforme web qui centralise le contenu de l'entreprise Synapse (accompagnement et formation des jeunes ivoiriens) autour de quatre rubriques : **prompts**, **formations**, **jeux & concours**, **bons plans & opportunités**.

Deux caractéristiques structurent tout le code :

- **Contenu à deux niveaux** — chaque contenu est `FREE` ou `PREMIUM`. Le premium s'obtient par un paiement unique donnant un accès à vie (pas d'abonnement).
- **Vitrine, pas plateforme d'exécution** — les jeux et concours se déroulent hors plateforme. Le site présente et enregistre les inscriptions, rien de plus.

**Périmètre v1 :** le **paiement n'est pas implémenté** (mockup visuel uniquement, agrégateurs en v2). Le **verrouillage serveur, lui, est réel dès la v1** : le statut premium est attribué manuellement en base, mais l'API se comporte comme si le paiement existait.

**Audience :** jeunes ivoiriens, majoritairement sur mobile, souvent en connexion dégradée. Le poids des pages et le nombre de requêtes comptent.

---

## Stack Overview

| Couche                      | Technologie                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Application (front + BFF)   | Next.js 15+ (App Router), TypeScript `strict`                                            |
| UI / Styles                 | Tailwind CSS, shadcn/ui                                                                  |
| Formulaires & validation    | React Hook Form + Zod                                                                    |
| État / Data fetching client | TanStack Query (React Query) v5                                                          |
| Backend                     | Route Handlers + Server Actions Next.js (BFF)                                            |
| ORM / Migrations            | Prisma                                                                                   |
| Base de données             | PostgreSQL 16                                                                            |
| Auth                        | Auth.js (NextAuth v5) + Prisma Adapter, stratégie de session `database`, cookie httpOnly |
| Hachage mots de passe       | argon2id                                                                                 |
| Tests                       | Vitest + Testing Library, Playwright (E2E)                                               |
| Lint / Format               | ESLint (config Next + `@typescript-eslint`), Prettier                                    |
| CI/CD                       | GitHub Actions                                                                           |
| Gestionnaire de paquets     | npm                                                                                      |

**Pas de Redis, pas de service externe, pas de microservice.** L'architecture BFF Next.js + PostgreSQL est délibérément légère : toute proposition d'ajout d'infrastructure doit être justifiée par un besoin démontré, pas anticipé.

### Déploiement et exploitation de la v1

- La cible applicative est **Vercel**. Le runtime Prisma utilise dans
  `DATABASE_URL` une connexion PostgreSQL **poolée et compatible serverless**.
- Les migrations `prisma migrate deploy` utilisent une connexion directe dans
  un environnement d'administration éphémère, jamais le pooler de transaction.
- Aucun fournisseur PostgreSQL managé n'est imposé par le dépôt. Le porteur du
  projet doit en sélectionner un qui fournit pooling, sauvegardes et restauration
  isolée ; le code et la documentation restent indépendants du fournisseur.
- Une sauvegarde active et un exercice de restauration vérifié sont des
  prérequis bloquants avant le premier trafic public.
- Après la v1, la prochaine étape est l'interface d'administration. Le paiement
  réel reste ultérieur et aucun dashboard n'entre dans le périmètre v1.

---

## Architecture

```
ssynapse/
├── prisma/
│   ├── schema.prisma              # source de vérité du modèle de données
│   ├── migrations/                # migrations versionnées — jamais éditées à la main
│   └── seed.ts                    # peuplement depuis ressources/
├── ressources/                    # contenu éditorial fourni (non versionné en code)
├── src/
│   ├── app/
│   │   ├── (public)/              # accueil + rubriques en accès libre
│   │   │   ├── prompts/
│   │   │   ├── formations/
│   │   │   ├── jeux/
│   │   │   └── opportunites/
│   │   ├── (auth)/                # /login, /register, /forgot-password
│   │   ├── (member)/              # routes protégées — layout avec garde de session
│   │   │   ├── compte/
│   │   │   └── premium/           # écran d'offre + tunnel mockup
│   │   ├── api/                   # Route Handlers = la couche BFF
│   │   │   ├── prompts/
│   │   │   ├── formations/
│   │   │   ├── jeux/
│   │   │   ├── opportunites/
│   │   │   └── auth/
│   │   ├── layout.tsx
│   │   └── error.tsx
│   ├── components/
│   │   ├── ui/                    # atomiques shadcn/ui (Button, Card, Input…)
│   │   └── features/              # composants métier (PromptCard, PremiumGate…)
│   ├── server/                    # cœur backend — `import "server-only"` en tête de CHAQUE fichier
│   │   ├── db.ts                  # singleton PrismaClient
│   │   ├── auth/                  # config Auth.js, helpers session, `requireUser()`
│   │   ├── services/              # logique métier pure, testable sans Next.js
│   │   ├── repositories/          # accès Prisma — aucune logique métier
│   │   ├── access/                # règles d'entitlement premium — point unique de vérité
│   │   ├── errors/                # erreurs domaine (ContentNotFound, NotEntitled…)
│   │   └── config.ts              # lecture + validation Zod des variables d'env
│   ├── lib/
│   │   ├── api.ts                 # seul point d'accès HTTP côté client
│   │   ├── validators/            # schémas Zod partagés client/serveur
│   │   └── utils.ts
│   ├── hooks/                     # useprompts, useInscription…
│   └── types/
├── tests/
│   ├── e2e/                       # Playwright
│   ├── api/                       # tests d'intégration des Route Handlers
│   ├── services/                  # tests unitaires métier
│   └── repositories/              # tests avec vraie base — pas de mock Prisma
└── middleware.ts                  # headers sécurité + rate limiting + garde de routes
```

**Règle de taille :** au-delà de 300 lignes → refactoriser si possible. Au-delà de 800 lignes → refactorisation obligatoire, PR refusée.

**Règle d'isolation serveur :** tout fichier sous `src/server/` commence par `import "server-only"`. Un composant client qui importe accidentellement du code serveur doit **casser le build**, pas fuiter en production.

---

## Flux architectural

Toute requête suit ce chemin sans exception — aucun saut de couche autorisé :

```
[Client React]
    │  fetch via lib/api.ts uniquement (jamais de fetch inline dans un composant)
    ▼
[Route Handler /api/*]     ← BFF : parse + valide le body avec Zod, lit la session, appelle le service
    │  DTO validé + session
    ▼
[Service]                  ← logique métier, appelle la couche access/, lève des erreurs domaine
    │  décision d'accès + intention métier
    ▼
[Access]                   ← répond à « cet utilisateur a-t-il droit à ce contenu ? » — point unique
    │  autorisé / refusé
    ▼
[Repository]               ← requêtes Prisma, `select` explicite, retourne des rows
    │  résultat DB
    ▼
[Service]                  ← mappe row → DTO de réponse (filtré selon l'entitlement)
    │  DTO
    ▼
[Route Handler]            ← sérialise, retourne la réponse HTTP
    ▼
[Client]
```

**Chemin alternatif — Server Components :** une page peut appeler directement un **service** (pas un repository). Elle ne fait jamais de `fetch` vers sa propre API.

**Règle d'or :**

- Un `Route Handler` ne touche **jamais** Prisma directement.
- Un `Service` ne retourne **jamais** de `NextResponse` et ne connaît pas HTTP.
- Un `Repository` ne contient **jamais** de logique métier ni de règle d'accès.
- Le `userId` vient **toujours** de la session vérifiée côté serveur — jamais du body, jamais d'un query param.
- Un composant client n'importe **jamais** quoi que ce soit de `src/server/`.

---

## Le modèle d'accès premium

C'est la règle métier la plus sensible du projet. Elle est concentrée dans `src/server/access/` et nulle part ailleurs.

### Principes

1. **Deux formes pour chaque contenu.** Un contenu premium existe sous deux DTO distincts :
   - `XxxTeaser` — titre, résumé, extrait éditorial distinct, tags, badge premium. Servi à tout le monde. L'extrait est stocké dans un champ dédié et n'est jamais fabriqué par troncature du corps verrouillé.
   - `XxxFull` — le corps réel (texte du prompt, contenu de la formation, lien d'inscription…). Servi **uniquement** à un utilisateur entitled.

2. **Le filtrage est fait par le `select` Prisma, pas par le mapping.** Le champ verrouillé ne doit pas être chargé en mémoire s'il ne doit pas être envoyé. C'est la seule défense qui survit à une erreur de sérialisation.

```ts
// ✅ le corps n'est même pas lu en base si l'utilisateur n'y a pas droit
const prompt = await promptRepository.findBySlug(slug, {
  includeBody: entitled,
})

// ❌ interdit — le corps transite en mémoire et finira par fuiter (log, erreur, RSC payload)
const prompt = await promptRepository.findBySlug(slug)
return entitled ? prompt : omit(prompt, ["body"])
```

3. **Aucune décision d'accès dans un composant.** `PremiumGate` est purement visuel : il affiche un cadenas quand le serveur n'a pas envoyé le contenu. Il ne masque jamais des données présentes.

4. **Une seule fonction d'entitlement**, utilisée par tous les services :

```ts
// src/server/access/entitlement.ts
export function canAccess(
  user: SessionUser | null,
  content: { visibility: Visibility },
): boolean {
  if (content.visibility === "FREE") return true
  return user?.membership === "PREMIUM"
}
```

5. **Pas de paiement en v1.** Le passage à `PREMIUM` se fait par une opération d'administration explicite et tracée. Aucune route publique ne doit pouvoir modifier `membership`. Le tunnel d'achat mockup **ne touche jamais** au statut de l'utilisateur.

6. **Test obligatoire par rubrique :** un utilisateur anonyme et un utilisateur `FREE` ne reçoivent jamais le champ verrouillé — vérifié sur la réponse HTTP brute, pas sur le rendu React.

---

## Standards de code

### TypeScript

**Interdictions absolues :**

- `any` — utiliser `unknown` + type guard, ou typer correctement
- `@ts-ignore` / `@ts-expect-error` sans commentaire expliquant pourquoi
- `as` pour forcer un type sur une donnée externe — valider avec Zod à la place
- `fetch()` dispersé dans les composants — tout passe par `lib/api.ts`
- Styles inline — Tailwind uniquement
- `localStorage` / `sessionStorage` pour quoi que ce soit d'authentification
- `console.log` en dehors du debug local — retirer avant PR
- Types DTO dupliqués à la main — dériver de Zod (`z.infer`) ou de Prisma (`Prisma.XxxGetPayload`)

**Nommage :**

- `camelCase` : variables, fonctions, hooks
- `PascalCase` : composants, types, interfaces, modèles Prisma
- `SCREAMING_SNAKE_CASE` : constantes
- `kebab-case` : fichiers et dossiers

### Structure des couches

```ts
// ── Route Handler (app/api/prompts/[slug]/route.ts) ──────────────
// HTTP uniquement : session, validation, appel service, réponse.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const session = await auth()
  const prompt = await promptService.getBySlug(slug, session?.user ?? null)
  return NextResponse.json(prompt)
}

// ── Service (server/services/prompt-service.ts) ──────────────────
// Logique métier pure. Pas de NextResponse. Lève des erreurs domaine.
import "server-only"

export async function getBySlug(
  slug: string,
  user: SessionUser | null,
): Promise<PromptTeaser | PromptFull> {
  const meta = await promptRepository.findMetaBySlug(slug)
  if (!meta) throw new ContentNotFoundError("prompt", slug)

  const entitled = canAccess(user, meta)
  const row = await promptRepository.findBySlug(slug, { includeBody: entitled })
  return entitled ? toFull(row) : toTeaser(row)
}

// ── Repository (server/repositories/prompt-repository.ts) ────────
// Prisma uniquement. `select` explicite. Aucune règle d'accès.
import "server-only"

export function findBySlug(slug: string, opts: { includeBody: boolean }) {
  return db.prompt.findUnique({
    where: { slug, publishedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      visibility: true,
      tags: true,
      body: opts.includeBody,
    },
  })
}
```

**Règles Prisma :**

- **Toujours** un `select` (ou `omit`) explicite. `findMany()` nu est interdit : il renvoie toute la ligne, y compris les champs qui deviendront sensibles plus tard.
- Un seul `PrismaClient`, exporté depuis `src/server/db.ts` (singleton, protégé du HMR en dev).
- Jamais de `$queryRawUnsafe`. `$queryRaw` en template tagué uniquement, et seulement si Prisma ne sait pas l'exprimer.
- Toute écriture multi-tables passe par `db.$transaction`.
- Pagination systématique sur les listes (`take` / `cursor`) — jamais de `findMany` non borné.
- Migrations générées par `prisma migrate dev`, jamais éditées à la main après application.

**Validation :**

- Un schéma Zod à **chaque frontière** : body de requête, query params, variables d'environnement, contenu lu depuis `ressources/`.
- `.strict()` sur tous les schémas d'entrée — un champ inconnu est une erreur, pas un champ ignoré.
- Le schéma Zod est la source de vérité du type : `type PromptCreate = z.infer<typeof promptCreateSchema>`.

**Gestion d'erreurs :**

- Erreurs domaine typées dans `server/errors/`, mappées en codes HTTP **dans le Route Handler uniquement**.
- Réponse d'erreur : message générique + `errorId` (UUID) loggué côté serveur. Jamais de stack trace, jamais de message Prisma brut renvoyé au client.

### React / Next.js

- **Server Component par défaut.** `"use client"` uniquement pour les event handlers, hooks d'état ou API navigateur — et le plus bas possible dans l'arbre.
- **Server Actions :** valider le payload avec Zod **et** revérifier la session à l'intérieur de l'action. Une Server Action est un endpoint public : le fait qu'elle soit appelée depuis un formulaire protégé ne prouve rien.
- **Attention au RSC payload :** tout ce qu'un Server Component passe en props à un Client Component est sérialisé et visible dans la réponse. Ne jamais passer un objet complet quand seuls deux champs sont utilisés.
- **États explicites** sur chaque écran : `loading` · `error` · `empty` · `success`.
- **Mobile-first absolu :** base 390px, puis `sm:` (640px) → `md:` (768px) → `lg:`.
- **Touch targets ≥ 44×44px** sur tout élément interactif.
- **Accessibilité :** HTML sémantique, `label` associé à chaque input, contraste AA minimum, navigation clavier fonctionnelle.
- **Images** via `next/image`, avec `width`/`height` — le public est en connexion dégradée.

---

## Sécurité

### Périmètre d'Auth.js

Auth.js occupe **une seule frontière** : entre le cookie du navigateur et la couche BFF. Il produit un `SessionUser` et s'arrête là. Cinq points de contact, et aucun autre :

| #   | Emplacement                                 | Rôle                                                                                                                                                                                               |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `prisma/schema.prisma`                      | Modèles imposés par le Prisma Adapter (`User`, `Account`, `Session`, `VerificationToken`) + nos champs métier sur `User` : `passwordHash`, `membership`                                            |
| 2   | `src/server/auth/`                          | Config Auth.js : provider Credentials (vérification argon2id), adapter Prisma, options de cookie, callback `session` qui injecte `membership`. **Seul endroit du projet qui importe `next-auth`.** |
| 3   | `app/api/auth/[...nextauth]/route.ts`       | Routes gérées par Auth.js seul : signin, signout, callback, session, csrf. On n'y écrit rien.                                                                                                      |
| 4   | `middleware.ts`                             | Garde grossière du groupe `(member)` — redirection UX, **pas** une protection                                                                                                                      |
| 5   | Handlers, Server Actions, Server Components | `requireUser()` — ou `auth()` quand l'anonyme est permis — qui alimente `canAccess(user, content)`                                                                                                 |

```
[cookie] → Auth.js → SessionUser { id, membership } → service(…, user) → canAccess()
                                                          ↓
                                              repository (select: { body: entitled })
```

**Où Auth.js n'intervient jamais :**

- **Ni dans un service, ni dans un repository.** Un service reçoit `SessionUser | null` **en paramètre** — il ne va jamais chercher la session lui-même. C'est ce qui le rend testable sans monter Next.js.
- **Ni dans un composant client** pour une décision d'accès. `useSession` est toléré pour de l'affichage cosmétique (nom, avatar) ; jamais pour masquer ou révéler du contenu.
- **Ni pour l'inscription.** `POST /api/auth/register` est notre route : validation Zod, hachage argon2id, création du `User`. Le provider Credentials ne fait que **vérifier** un mot de passe existant.

**Stratégie de session : `database`, pas JWT.**
`membership` transite dans la session : c'est donc un **cache du statut premium**. En stratégie JWT, un utilisateur promu `PREMIUM` en base ne verrait rien changer avant de s'être reconnecté — inacceptable en v1 où la promotion est manuelle. La stratégie `database` (celle qu'active naturellement le Prisma Adapter) coûte une requête par requête authentifiée, sans conséquence à cette échelle, et rend le statut effectif immédiatement. Elle évite aussi d'avoir à gérer une invalidation de token quand le paiement réel arrivera en v2.

### Authentification & session

- Session Auth.js dans un cookie **httpOnly + Secure + SameSite=Lax** — jamais de token en `localStorage`.
- Hachage des mots de passe : **argon2id** exclusivement. Pas de bcrypt, pas de SHA, pas de MD5.
- Politique mot de passe : 12 caractères minimum, vérifiés côté serveur.
- Rotation de session à la connexion et au changement de mot de passe.
- `requireUser()` (dans `server/auth/`) est le **seul** moyen d'obtenir l'utilisateur courant côté serveur. Il lève si la session est absente ou invalide.
- Le `middleware.ts` protège les groupes de routes, mais **ne remplace pas** la vérification dans le Route Handler ou la Server Action. Défense en profondeur : les deux, toujours.
- Réponses d'authentification identiques que le compte existe ou non (pas d'énumération de comptes).

### Données & API

- **Autorisation :** toute lecture ou écriture d'une ressource appartenant à un utilisateur (inscription à un jeu, profil) filtre sur `userId` issu de la session. Jamais confiance à un ID passé par le client.
- **Validation :** Zod `.strict()` sur toutes les entrées. Longueurs maximales explicites sur tous les champs texte.
- **Rate limiting** (middleware, compteur en PostgreSQL — suffisant à cette échelle) :
  - routes générales : 60 req/min par IP
  - `/api/auth/*` et inscriptions : 10 req/min par IP
- **Protection CSRF :** vérification de l'origine sur toutes les mutations (Auth.js la fournit sur ses routes ; à appliquer explicitement ailleurs).
- **Upload de fichiers :** aucun en v1. Toute proposition d'upload doit passer par une revue dédiée.
- **Erreurs :** message générique côté client, détail loggué côté serveur avec `errorId`.
- **Logging :** JSON structuré. Ne jamais logger un mot de passe, un cookie de session, un token, ni le corps d'un contenu premium.

### Headers HTTP (définis dans `next.config.ts` et/ou `middleware.ts`)

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` strict, sans `unsafe-inline` ni `unsafe-eval` (nonce pour les scripts Next)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), camera=(), microphone=()`

### Secrets & configuration

- Zéro secret en dur, y compris dans les tests et les seeds.
- Toutes les variables d'environnement sont déclarées et validées par un schéma Zod dans `src/server/config.ts`. Une variable manquante fait **échouer le démarrage**, pas la première requête.
- Seules les variables réellement publiques portent le préfixe `NEXT_PUBLIC_`. Toute nouvelle variable `NEXT_PUBLIC_` doit être justifiée en PR — elle est visible dans le bundle.
- `.env*` dans `.gitignore`, `.env.example` versionné avec des valeurs factices.
- `DATABASE_URL` n'est jamais logguée, ni affichée dans une page d'erreur.

### Contenu & rendu

- Le contenu éditorial vient de `ressources/` : le traiter comme **non fiable**. Rendu en texte brut par défaut ; si du Markdown est nécessaire, rendu sans HTML inline, ou assaini via `DOMPurify`. Jamais de `dangerouslySetInnerHTML` sans assainissement explicite justifié en commentaire.
- Zéro donnée sensible dans les query params ou le hash d'URL (loggués par les CDN et proxies).

### Dépendances

- `npm audit` à chaque run CI — zéro vulnérabilité `high` ou `critical` non traitée.
- Toute nouvelle dépendance est justifiée en PR : ce qu'elle apporte, son poids, sa maintenance.

---

## Pipeline de développement

```bash
# 1. Base de données locale
docker compose up -d postgres

# 2. Application
npm install
npx prisma migrate dev          # applique les migrations + régénère le client
npx prisma db seed              # peuple depuis ressources/ (ou données de démo)
npm run dev                     # :3000
```

**Workflow feature :**

1. Écrire la spec en tête du fichier service : comportement attendu, edge cases, **règle d'accès premium applicable**.
2. Modèle de données : `prisma/schema.prisma` → `npx prisma migrate dev --name add_feature`.
3. Créer les stubs dans l'ordre : `validators/` (Zod) → `repositories/` → `services/` → `app/api/` → `hooks/` → `components/`.
4. Écrire les tests **avant** l'implémentation. Un test ne se modifie jamais pour faire passer du code incorrect.
5. Implémenter jusqu'au vert.
6. Valider sur viewport 390px (DevTools → iPhone 14 Pro).
7. `npm run lint && npm run type-check && npm run test` — tout au vert avant d'ouvrir une PR.

---

## Commandes utiles

```bash
# ── Développement ─────────────────────────────────────────────────
npm run dev                     # serveur de dev :3000
npm run build                   # build production — doit passer avant toute PR
npm run lint                    # ESLint
npm run type-check              # tsc --noEmit
npm run format                  # Prettier

# ── Tests ─────────────────────────────────────────────────────────
npm run test                    # Vitest
npm run test -- --coverage      # Vitest + couverture
npm run e2e                     # Playwright

# ── Base de données ───────────────────────────────────────────────
npx prisma migrate dev --name <description>   # créer + appliquer une migration
npx prisma migrate deploy                     # appliquer en production
npx prisma generate                           # régénérer le client
npx prisma studio                             # explorateur de données (local uniquement)
npx prisma db seed                            # peupler depuis ressources/

# ── Sécurité ──────────────────────────────────────────────────────
npm audit                       # CVE des dépendances

# ── Infrastructure ────────────────────────────────────────────────
docker compose up -d postgres
docker compose down
```

---

## Points de revue pour toute nouvelle fonctionnalité

### Données & backend

- Modèle ajouté dans `prisma/schema.prisma` avec `createdAt` / `updatedAt`, et `visibility` si c'est un contenu
- Migration générée via `prisma migrate dev` (jamais éditée à la main)
- Index sur les colonnes réellement filtrées ou triées
- Schémas Zod dans `lib/validators/`, `.strict()` sur les entrées
- Repository dans `server/repositories/` — `select` explicite, pagination, aucune règle métier
- Service dans `server/services/` — `import "server-only"`, erreurs domaine, appel à `canAccess()` si contenu gated
- Route Handler dans `app/api/` — session vérifiée, validation Zod, mapping des erreurs domaine → HTTP
- Aucun champ premium chargé pour un utilisateur non entitled

### Frontend

- Fonction(s) ajoutée(s) dans `lib/api.ts` uniquement
- Hook dans `hooks/use-feature.ts`
- Composant dans `components/features/`, page dans le bon groupe de routes
- Server Component par défaut ; `"use client"` justifié et poussé au plus bas
- États gérés : `loading` · `error` · `empty` · `success`
- Aucun `any`, aucun style inline, aucun `console.log`
- Touch targets ≥ 44px, testé sur viewport 390px

### Tests

- Test service : logique métier et edge cases
- Test repository : vraie base de données, pas de mock Prisma
- Test API : happy path + codes d'erreur
- **Test d'accès : anonyme et `FREE` ne reçoivent jamais le champ premium** (assertion sur le JSON brut)
- Test d'isolation : un utilisateur ne peut pas lire ou modifier la ressource d'un autre

### Avant la PR

- `npm run lint && npm run type-check && npm run test && npm run build` au vert
- `npm audit` sans `high` / `critical` nouveau
- Aucune nouvelle variable `NEXT_PUBLIC_` non justifiée

---

## Pièges à éviter (Gotchas)

### Sécurité & accès

| Piège                                                    | Cause                                                        | Solution                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Contenu premium visible dans le HTML malgré le cadenas   | Filtrage fait en React au lieu du serveur                    | Ne jamais charger le champ : `select: { body: entitled }` dans le repository                                                      |
| Fuite via le RSC payload                                 | Objet complet passé en props à un Client Component           | Passer uniquement les champs utilisés, mappés explicitement                                                                       |
| Server Action appelée hors du formulaire prévu           | On suppose que le contexte UI protège l'action               | Revérifier session + valider le payload **dans** l'action, toujours                                                               |
| `middleware.ts` seul comme protection                    | Le matcher ne couvre pas toutes les routes, ou est contourné | Vérification dupliquée dans chaque handler — défense en profondeur                                                                |
| ID de ressource pris du body                             | Réflexe d'API non authentifiée                               | `userId` toujours issu de la session ; le body ne contient jamais d'ID d'utilisateur                                              |
| Secret exposé dans le bundle                             | Variable préfixée `NEXT_PUBLIC_` par habitude                | Préfixe uniquement pour ce qui est réellement public, revu en PR                                                                  |
| Utilisateur promu `PREMIUM` qui reste bloqué             | `membership` figé dans un JWT jusqu'à reconnexion            | Stratégie de session `database` — jamais `jwt` tant que `membership` voyage dans la session                                       |
| `next-auth` importé dans un service pour lire la session | Réflexe de « récupérer l'utilisateur là où on en a besoin »  | La session descend **en paramètre** depuis le handler ; un `import next-auth` hors de `server/auth/` est un défaut d'architecture |

### Prisma & base de données

| Piège                                   | Cause                                                           | Solution                                                                    |
| --------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Épuisement du pool de connexions en dev | Nouveau `PrismaClient` à chaque HMR                             | Singleton dans `server/db.ts` avec cache sur `globalThis`                   |
| `findMany()` non borné                  | Oubli de pagination sur une table qui va grossir                | `take` obligatoire sur toute liste, `cursor` pour la suite                  |
| Requêtes N+1                            | Boucle qui interroge la base par item                           | `include` / `select` imbriqué, ou une requête agrégée                       |
| Champ sensible renvoyé par accident     | Absence de `select` explicite                                   | `select` obligatoire partout — jamais de retour de ligne complète           |
| Migration destructive en production     | `migrate dev` lancé hors local, ou colonne supprimée sans étape | `migrate deploy` en production, sauvegarde avant, suppression en deux temps |
| Décimales monétaires fausses            | Montant stocké en `Float`                                       | `Decimal` Prisma + `NUMERIC` Postgres ; jamais de `Float` pour de l'argent  |

### Next.js & UI

| Piège                                                | Cause                                     | Solution                                                                    |
| ---------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Page premium mise en cache et servie à tout le monde | Route statique par défaut                 | Route dynamique + `cache: "no-store"` sur tout ce qui dépend de la session  |
| Erreur d'hydratation                                 | Date ou locale rendue côté serveur        | Formatage dans un `useEffect`, ou `suppressHydrationWarning` ciblé          |
| Double soumission de formulaire                      | Bouton non désactivé pendant la mutation  | `isPending` de TanStack Query / `useFormStatus`, bouton désactivé           |
| Import serveur dans un composant client              | Barrel file qui réexporte du code serveur | `import "server-only"` en tête de chaque fichier `server/` — le build casse |
| Formation ou concours affiché après sa date de fin   | Filtre de publication oublié              | Filtrer sur `publishedAt` / `endsAt` dans le repository, pas dans la vue    |

---

## Conventions de commit

Format : `type(scope): description courte` — [Conventional Commits](https://www.conventionalcommits.org/)

```
feat(prompts): ajouter la recherche par domaine
fix(auth): corriger la session non renouvelée après changement de mot de passe
security(premium): ne plus charger le corps du prompt pour les non-membres
test(jeux): ajouter le test d'inscription en double
refactor(repositories): extraire la pagination par curseur
chore(deps): mettre à jour Prisma vers 6.x
docs(agents): préciser les règles d'entitlement
perf(formations): indexer la colonne publishedAt
```

**Types autorisés :** `feat` · `fix` · `security` · `test` · `refactor` · `chore` · `docs` · `perf`

**Scopes autorisés :** `prompts` · `formations` · `jeux` · `opportunites` · `auth` · `premium` · `api` · `db` · `ui` · `deps` · `infra`

---

_Dernière mise à jour : 2026-08-07_
