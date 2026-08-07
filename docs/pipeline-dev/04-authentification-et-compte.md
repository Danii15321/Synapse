# 04 — Authentification et compte

> **Nature :** tranche verticale · **Dépend de :** `03` · **Prépare :** `05`, `09`, `10`

---

## Objectif

Un visiteur crée un compte, se connecte, voit son espace membre, se déconnecte. La session est fiable côté serveur et porte le statut `membership`, qui servira de socle au verrouillage premium en tranche `05`.

## Pourquoi ici

**Dépendance stricte** : le modèle d'accès premium (`05`) a besoin d'une identité vérifiée. Sans session, `canAccess(user, content)` n'a pas d'argument.

Cette tranche vient **après** le socle de sécurité (`03`) parce qu'elle en consomme trois briques immédiatement : la limitation de débit sur les routes de connexion, la gestion d'erreurs sans fuite, et le helper de validation Zod. Construire l'auth avant aurait signifié les écrire deux fois.

---

## Contenu

### Modèle

- Les modèles imposés par le Prisma Adapter : `User`, `Account`, `Session`, `VerificationToken`.
- Sur `User`, nos champs métier : `passwordHash` et `membership` (`FREE` | `PREMIUM`, défaut `FREE`).

`membership` est introduit **ici**, alors qu'il ne sert qu'en `05`. C'est délibéré : le champ appartient au modèle d'identité, et l'ajouter maintenant évite une migration supplémentaire sur la table la plus sensible du projet.

### Auth.js — cinq points de contact, pas un de plus

Le périmètre est défini dans [AGENTS.md](../../AGENTS.md#périmètre-dauthjs). En résumé opérationnel :

- `src/server/auth/` — **seul endroit du projet qui importe `next-auth`** : provider Credentials, adapter Prisma, options de cookie, callback `session` qui injecte `membership`.
- `app/api/auth/[...nextauth]/route.ts` — routes gérées par Auth.js.
- `middleware.ts` — garde du groupe `(member)`, redirection UX uniquement.
- `requireUser()` — le seul moyen d'obtenir l'utilisateur courant côté serveur.
- **Stratégie de session `database`**, jamais `jwt`. Justification dans AGENTS.md : `membership` voyage dans la session, et en v1 la promotion premium se fait manuellement en base — avec un JWT, l'utilisateur promu resterait bloqué jusqu'à reconnexion.

### Inscription — notre route, pas celle d'Auth.js

`POST /api/auth/register` est écrite par nous : validation Zod `.strict()`, hachage **argon2id**, création du `User`. Le provider Credentials d'Auth.js ne fait que **vérifier** un mot de passe existant.

Règles non négociables :
- 12 caractères minimum, vérifiés **côté serveur** (la validation client est un confort, pas un contrôle).
- **Aucune énumération de comptes** : que l'adresse existe ou non, la réponse et le temps de réponse doivent être indiscernables. C'est le point que les implémentations ratent le plus souvent.
- Rate limiting à 10 req/min, hérité de la tranche `03`.

### Écrans

- `(auth)/login`, `(auth)/register` — React Hook Form + Zod, états `loading`/`error`, bouton désactivé pendant la soumission.
- `(member)/compte` — page protégée : e-mail, statut d'adhésion, déconnexion.
- **Changement de mot de passe depuis le compte** — ancien mot de passe exigé, nouveau validé par la même règle qu'à l'inscription, rotation de session après succès, régime de rate limiting sensible.
- Le lien de connexion dans la navigation, et l'état connecté/déconnecté visible.

Le changement de mot de passe n'est pas un confort : la réinitialisation par e-mail est hors v1, donc **sans cet écran un utilisateur n'a aucun moyen de changer son mot de passe**, y compris s'il le sait compromis. Un compte dont on ne peut pas reprendre le contrôle est un défaut de sécurité, pas une fonctionnalité manquante.

---

## Hors périmètre

- Réinitialisation de mot de passe par e-mail — nécessite un envoi d'e-mail, hors v1. La route `/forgot-password` peut exister en écran statique.
- Fournisseurs OAuth (Google…). L'adapter les rendra faciles à ajouter plus tard.
- Toute interface d'administration.

---

## Livrable démontrable

Un visiteur crée un compte, est redirigé connecté, voit `/compte` avec le statut `FREE`, se déconnecte, se reconnecte. Un visiteur non connecté qui ouvre `/compte` est redirigé vers `/login`.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Test : le cookie de session porte bien `httpOnly`, `Secure`, `SameSite=Lax`.
- [ ] Test : `requireUser()` lève quand la session est absente, expirée ou falsifiée.
- [ ] Test : **pas d'énumération de comptes** — réponses identiques sur adresse existante et inexistante.
- [ ] Test : le mot de passe n'est jamais renvoyé dans une réponse, ni journalisé.
- [ ] Test : une route protégée appelée **sans passer par le middleware** (appel direct au handler) refuse quand même l'accès — défense en profondeur.
- [ ] Test : le changement de mot de passe refuse un ancien mot de passe erroné, et invalide les autres sessions après succès.
- [ ] Vérifié : `next-auth` n'est importé nulle part hors de `src/server/auth/`.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Se reposer sur `middleware.ts` seul | Un `matcher` incomplet ouvre la route ; le middleware ne couvre pas les appels internes | Vérification **aussi** dans chaque handler et Server Action |
| Session lue directement dans un service | Le service devient intestable sans Next.js, et l'architecture part en vrille | La session descend **en paramètre** depuis le handler |
| Stratégie `jwt` par réflexe | L'utilisateur promu `PREMIUM` reste bloqué jusqu'à reconnexion | `database`, décidé et documenté |
| Messages d'erreur différenciés à la connexion | Énumération de comptes offerte | Message unique, temps de réponse constant |
| bcrypt « parce que c'est plus courant » | Non conforme à AGENTS.md | argon2id, sans exception |
| Server Action protégée « parce que le formulaire est protégé » | Une Server Action est un endpoint public appelable directement | `requireUser()` **dans** l'action, systématiquement |

---

## À trancher

- **Vérification d'adresse e-mail à l'inscription ?** Elle suppose un envoi d'e-mail, donc un service externe — contraire à la légèreté visée en v1. Recommandation : pas de vérification en v1, champ `emailVerified` présent mais inutilisé, activation en v2 avec la réinitialisation de mot de passe.
- **Durée de session.** Recommandation : 30 jours glissants — le public est mobile et se reconnecte peu volontiers.
