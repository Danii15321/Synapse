# 06 — Shell du site et identité

> **Nature :** tranche verticale — le cadre · **Dépend de :** `05` · **Prépare :** `07`, `08`, `09`, `10`

---

## Objectif

Transformer un ensemble d'écrans en **un site**. À la fin de cette tranche, un visiteur arrive sur une page d'accueil, comprend ce qu'est Synapse, atteint les quatre rubriques, et retrouve partout la même navigation et la même identité visuelle.

## Pourquoi ici

**Après `05`** parce que la navigation doit afficher l'état connecté (tranche `04`) et le statut d'adhésion (tranche `05`). Une navigation construite avant l'auth serait à refaire.

**Avant `07`, impérativement.** La tranche `07` fige le **patron de rubrique** : cartes, listes, états d'écran, page de détail. Ce patron est ensuite répliqué trois fois. S'il est construit avant que le vocabulaire visuel existe, il faudra le restyler — donc restyler aussi les trois réplications. C'est exactement la multiplication d'effort que le principe « patron validé, puis réplication » cherche à éviter.

Autrement dit : on pose le cadre, **puis** on fabrique le tableau qu'on accrochera quatre fois dedans.

---

## Contenu

### Identité visuelle — appliquée

Les *tokens* (palette, typographie, échelle d'espacement, rayons, ombres) sont définis dans la configuration Tailwind en tranche `01`. Ici, on les **met en œuvre** :

- Composants shadcn/ui alignés sur les tokens — plus aucune couleur écrite en dur dans un composant.
- Hiérarchie typographique cohérente : titres, corps, légendes, libellés.
- États d'interaction homogènes : survol, focus visible (obligatoire pour l'accessibilité), désactivé, chargement.
- **Un composant `Badge` premium** unique, réutilisé partout. Un cadenas dessiné différemment dans chaque rubrique est le premier symptôme d'un design system absent.

### Layout racine

- **Header** : logo, navigation vers les quatre rubriques, état connecté / déconnecté, accès au compte.
- **Menu mobile** — la navigation principale sur 390px. Cibles ≥ 44 px, fermeture au tap extérieur, piégeage du focus, fonctionnel au clavier.
- **Footer** : liens institutionnels, mention de l'offre premium, année.
- Le layout est un **Server Component** ; seuls le menu mobile et l'indicateur de session sont clients.

### Page d'accueil

C'est la seule page dont le rôle est de **convaincre**, pas d'informer :

1. Ce qu'est Synapse et ce que la plateforme apporte — repris du [README](../../README.md), pas réinventé.
2. Les quatre rubriques, chacune avec son entrée et un compteur réel (« 24 prompts », « 3 concours ouverts »). Le compteur vient de la base, jamais d'une constante.
3. Un bloc de mise en avant : les contenus les plus récents.
4. Un appel vers l'offre premium — le tunnel arrive en `10`, le lien peut pointer vers un écran d'attente d'ici là.

**Sur le bloc de mise en avant :** il utilise ici une carte **provisoire**, volontairement simple. La carte de référence est définie en `07` avec le patron de rubrique, et la remplacera — c'est inscrit dans la DoD de `07`. Définir la carte définitive ici reviendrait à fixer le patron dans la mauvaise tranche.

### Convention média

La plateforme sera pauvre sans visuels : une formation ou un concours sans image se vend mal. On fixe la convention ici, **le champ arrive dans chaque modèle avec sa rubrique** (`07`, `08`, `09`) :

- Pas d'upload en v1. Les images sont fournies dans `ressources/<rubrique>/images/` et copiées vers `public/` à l'import (tranche `11`).
- `next/image` partout, `width`/`height` renseignés, format moderne. Le public est en connexion dégradée : une image non dimensionnée coûte un décalage de mise en page et des octets inutiles.
- **Un visuel de repli par rubrique**, généré à partir du titre ou du domaine. Aucune carte ne doit jamais afficher un trou.
- Ratio unique pour toutes les cartes, décidé ici, respecté partout.

### Pages institutionnelles

Structure et mise en page ici ; **le texte vient de vous** (voir « À trancher ») :

- **À propos** — qui est Synapse, les trois thématiques, le positionnement.
- **Contact** — moyens de contact. Pas de formulaire en v1 : il suppose un envoi d'e-mail, hors périmètre. Liens directs (WhatsApp, e-mail, réseaux).
- **Mentions légales**, **Politique de confidentialité**, **Conditions d'utilisation**.

> Les pages légales ne sont pas décoratives. La plateforme crée des comptes, conserve des adresses e-mail et présente une offre payante. Une politique de confidentialité **inventée** est pire que pas de page du tout : elle engage sur des pratiques qui ne sont pas les vôtres. La tranche livre la structure et le gabarit ; le contenu est fourni ou validé par vous.

### SEO et partage

- `metadataBase`, titre et description par défaut, gabarit de titre par page.
- **`robots.txt`** et **`sitemap.xml`** générés par Next. Le sitemap se remplit des rubriques existantes et s'étend mécaniquement à chaque rubrique ajoutée.
- **Favicon et icônes** d'application, `manifest` minimal.
- **Image Open Graph par défaut** — sans elle, tout partage sur WhatsApp affiche un rectangle vide, et c'est le canal principal du public visé.

### Habillage des pages d'erreur

La tranche `03` a posé le mécanisme (`error.tsx`, `not-found.tsx`, `errorId`). Ici on les habille : message compréhensible en français, chemin de retour, cohérence visuelle. Un `404` qui renvoie vers l'accueil et les rubriques vaut mieux qu'une impasse.

### Reprise de l'existant

Les écrans des tranches `02` à `05` ont été construits sans vocabulaire visuel. **Les amener sur le design system fait partie de cette tranche**, ce n'est pas un travail à part — l'invariant de tranche l'exige.

---

## Hors périmètre

- Le contenu des rubriques — c'est `07` à `09`.
- Recherche globale tous contenus confondus.
- Thème sombre, PWA installable, animations élaborées.
- Formulaire de contact (nécessite l'e-mail, hors v1).

---

## Livrable démontrable

Sur un téléphone, on arrive sur l'accueil, on comprend ce qu'est Synapse, on ouvre le menu, on visite les quatre rubriques et les pages institutionnelles, on se connecte, et la navigation reflète l'état de session. Un lien partagé sur WhatsApp affiche un aperçu correct.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Aucune couleur, taille de police ou espacement écrit en dur dans un composant — tout passe par les tokens.
- [ ] Menu mobile utilisable **au clavier** : ouverture, parcours, fermeture par `Échap`, focus piégé.
- [ ] Focus visible sur tous les éléments interactifs, contraste AA vérifié.
- [ ] Les compteurs de l'accueil viennent de la base, pas de constantes.
- [ ] `robots.txt` et `sitemap.xml` répondent ; le sitemap ne référence **aucune** page protégée ni contenu non publié.
- [ ] Un partage de l'accueil et d'une page de rubrique affiche un aperçu correct (testé sur un vrai fil WhatsApp).
- [ ] Les cinq pages institutionnelles existent et sont atteignables depuis le footer.
- [ ] Les écrans des tranches `02` à `05` sont passés sur le design system — plus aucun écran orphelin.
- [ ] Le visuel de repli s'affiche correctement pour un contenu sans image.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Couleurs en dur « juste pour ce composant » | Le design system meurt en trois écrans | Tokens uniquement, vérifié en revue |
| Menu mobile en `"use client"` remontant jusqu'au layout | Tout le site devient client, SEO et performance effondrés | Composant client minuscule, isolé dans un layout serveur |
| Sitemap qui liste les pages `(member)` ou les brouillons | Contenu protégé indexé par les moteurs | Sitemap alimenté par le repository, avec les mêmes filtres de publication |
| Pages légales rédigées par l'agent | Engagement juridique inventé au nom de l'entreprise | Structure livrée vide ou en gabarit, texte fourni ou validé par le porteur |
| Compteurs codés en dur pour « faire joli » | Chiffres faux dès le premier import de contenu | Requête agrégée, mise en cache courte si besoin |
| Carte de contenu définitive dessinée ici | Le patron est figé dans la mauvaise tranche, puis dupliqué | Carte provisoire assumée, remplacée en `07` |
| Absence d'image Open Graph | Partages WhatsApp sans aperçu — canal principal du public | Image par défaut posée dans cette tranche |

---

## À trancher

- **Charte graphique existante ?** Logo, couleurs, typographie de Synapse. S'ils existent, les fournir **avant** cette tranche : les inventer puis les remplacer coûte un restylage complet. Sinon, une palette sobre est proposée et validée ici.
- **Textes des pages institutionnelles et légales.** À fournir par vous, comme le contenu éditorial. Un gabarit peut être proposé, mais il doit être relu et assumé — voir l'encadré plus haut.
- **Ratio des visuels de carte.** 16/9 (classique, économe) ou 4/3 (plus présent sur mobile) ? À figer ici, puisque toutes les images fournies devront le respecter.
- **Nom de domaine et `metadataBase`.** Nécessaire pour des URL absolues correctes dans le sitemap et les aperçus de partage. Une valeur provisoire suffit en local.
