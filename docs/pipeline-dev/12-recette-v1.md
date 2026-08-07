# 12 — Recette v1

> **Nature :** validation · **Dépend de :** toutes les tranches · **Conclut :** la v1

---

## Objectif

Prononcer la v1 **preuves à l'appui**, pas au sentiment. Cette tranche ne développe rien de nouveau : elle vérifie, mesure et corrige.

## Pourquoi ici

Une recette placée en fin ne remplace pas la DoD de chaque tranche — elle vérifie ce qu'aucune tranche ne pouvait voir seule : **les parcours complets**, la cohérence entre rubriques, le comportement à volume réel, et l'absence de dérive accumulée.

Trois choses ne se testent qu'ici : le parcours d'un utilisateur qui traverse plusieurs rubriques, l'homogénéité de l'ensemble, et la reproductibilité depuis zéro.

---

## Contenu

### Parcours de bout en bout — les trois profils

À jouer intégralement, en E2E automatisé **et** à la main sur un vrai téléphone.

| Profil | Parcours |
|---|---|
| **Visiteur anonyme** | Accueil → chaque rubrique → contenu gratuit lu → contenu premium verrouillé et compris → offre premium → inscription |
| **Membre `FREE`** | Connexion → contenu gratuit → contenu premium toujours verrouillé → inscription à un concours gratuit → compte et inscriptions |
| **Membre `PREMIUM`** | Connexion → tout le contenu accessible → inscription à un concours premium → compte |

Le test à la main sur téléphone réel n'est pas redondant avec Playwright : il révèle les cibles tactiles trop petites, les contrastes faibles en plein soleil, les claviers qui masquent les champs.

### Audit de sécurité

- **Audit d'entitlement, rubrique par rubrique** — le contrôle le plus important de la recette. Pour chaque champ verrouillé de chaque rubrique (`body`, `excerpt`, `externalUrl`…), vérifier sur le **JSON brut** et le **HTML servi** qu'un anonyme et un `FREE` ne le reçoivent jamais. Quatre rubriques, tous les champs — un tableau exhaustif, pas un sondage.
- `npm audit` : zéro `high`, zéro `critical`.
- Headers vérifiés sur les pages publiques **et** protégées ; CSP sans `unsafe-inline`.
- Rate limiting effectif sur les routes sensibles.
- Aucun secret dans le dépôt — vérifier aussi l'historique Git, pas seulement l'état courant.
- Vérifier qu'aucun chemin ne mène à `grantPremium` depuis l'extérieur.
- Une revue de sécurité outillée (`/security-review`) sur l'ensemble du diff.

### Performance mobile

Le public cible est sur mobile, souvent en connexion dégradée. Ce n'est pas un critère de confort.

- Mesure sur bridage 3G lent : temps d'affichage utile de la liste et du détail.
- Poids des pages et des images ; `next/image` partout, dimensions renseignées.
- Visuel de repli affiché correctement partout où `coverImage` est absent — aucune carte trouée.
- Vérifier l'absence de requêtes N+1 avec les logs Prisma activés, à volume réel.
- Vérifier que les pages dépendant de la session **ne sont pas** mises en cache.

### Accessibilité

- Navigation clavier complète.
- Chaque champ a un `label` associé.
- Contraste AA minimum.
- Cibles tactiles ≥ 44×44 px, vérifiées sur les listes denses.
- Structure de titres cohérente, textes alternatifs sur les images porteuses de sens.

### Reproductibilité depuis zéro

Sur une machine propre, ou dans un conteneur vierge :

```bash
git clone <dépôt> && cd ssynapse
npm install
docker compose up -d postgres
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Si une étape manuelle non documentée est nécessaire, **la recette échoue** — la documentation est corrigée, puis on recommence.

### Cohérence d'ensemble

- Les quatre rubriques se comportent pareil : mêmes états, mêmes messages, même verrouillage.
- Les messages d'erreur sont en français, compréhensibles, sans jargon technique.
- Les états vides sont utiles (« aucun résultat pour ce filtre » plutôt qu'une page blanche).
- Un `404` sur un slug inexistant, pas une erreur serveur.

### Le site comme un tout

Ce que seule la fin permet de vérifier :

- Les cinq pages institutionnelles existent, sont atteignables et **contiennent le texte fourni**, pas un gabarit oublié.
- `robots.txt` et `sitemap.xml` répondent. Le sitemap **ne référence aucune page `(member)`, aucun brouillon, aucune opportunité périmée**.
- Un lien de chaque rubrique partagé sur WhatsApp affiche un aperçu correct — et **l'aperçu d'un contenu premium n'expose pas le corps**.
- Un utilisateur peut changer son mot de passe, seul moyen de reprendre le contrôle de son compte en l'absence d'e-mail.

---

## Livrable démontrable

Une v1 installable depuis un clone frais, navigable avec le vrai contenu, où le verrouillage premium est prouvé sur les quatre rubriques, et dont la CI est verte.

---

## DoD de la v1

Au-delà de la DoD de tranche, ce qui autorise à déclarer la v1 finie :

- [ ] Les trois parcours E2E passent en CI.
- [ ] Le tableau d'audit d'entitlement est complet, **tous les champs de toutes les rubriques**, sans exception non justifiée.
- [ ] Test manuel réalisé sur un téléphone réel, pas seulement en émulation DevTools.
- [ ] `npm audit` propre, headers vérifiés, revue de sécurité passée.
- [ ] Installation depuis un clone frais réussie **sans étape non documentée**.
- [ ] [README.md](../../README.md) et [AGENTS.md](../../AGENTS.md) à jour de tous les écarts constatés en cours de route.
- [ ] La liste « hors v1 » ci-dessous est écrite et assumée.

---

## Explicitement hors v1

À écrire noir sur blanc, pour que personne ne le découvre en production :

- **Paiement réel** — pas de PSP, pas de webhook. Adhésion attribuée manuellement.
- **E-mails** — aucun envoi : ni confirmation d'inscription, ni réinitialisation de mot de passe, ni notification.
- **Interface d'administration** — le contenu se met à jour par réimport, l'adhésion par script.
- **Déroulement des jeux sur la plateforme** — hors périmètre par conception.
- **Recherche avancée**, archive des opportunités expirées, liste d'attente sur les concours.
- **Fournisseurs OAuth**, vérification d'adresse e-mail, réinitialisation de mot de passe oubliée.
- **Suppression de compte et export de ses données** par l'utilisateur — à traiter en v2. À signaler dans la politique de confidentialité, avec la procédure manuelle en attendant : une plateforme qui collecte des comptes doit dire comment on en sort.
- **Upload de fichiers ou d'images** depuis l'interface — les visuels passent par `ressources/`.
- **Thème sombre, PWA installable, formulaire de contact.**

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Recette réduite à « ça a l'air de marcher » | Les fuites de gating ne se voient pas à l'écran | Audit systématique sur JSON brut et HTML |
| Tester uniquement en émulation DevTools | Cibles tactiles et lisibilité réelles non validées | Un vrai téléphone, en conditions réelles |
| Corriger un défaut sans test de non-régression | Il reviendra | Tout correctif de recette arrive avec son test |
| Déclarer la v1 avec des « détails » en suspens | Les détails deviennent la v1 | La DoD ci-dessus, sans exception négociée |
| Hors-périmètre implicite | Attentes déçues côté utilisateurs et côté équipe | Liste écrite et communiquée |

---

## À trancher

- **Cible de déploiement.** Vercel (rapide, mais Prisma exige une stratégie de pooling) ou VPS avec Docker (plus de contrôle, plus d'exploitation) ? Sans impact sur la v1 locale, mais c'est la question suivante immédiate.
- **Sauvegardes de la base** dès la mise en ligne — sujet d'exploitation, mais qui ne doit pas attendre le premier incident.
- **Suite après la v1 :** paiement (v2) ou administration du contenu d'abord ? Recommandation : **l'administration**, car le réimport manuel devient vite le vrai goulot d'étranglement, bien avant que le paiement manuel ne pose problème.
