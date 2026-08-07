# 10 — Tunnel premium (mockup)

> **Nature :** tranche verticale — présentation uniquement · **Dépend de :** `09` · **Prépare :** la v2

---

## Objectif

Mettre en scène le parcours d'adhésion premium **sans implémenter le moindre paiement** : écran d'offre, choix du moyen de paiement (Wave, mobile money), écran de fin. Et préparer proprement l'emplacement où le paiement réel se branchera en v2.

## Pourquoi ici

Cette tranche est **volontairement tardive**. Elle ne présente aucun risque technique et ne bloque rien : le verrouillage premium fonctionne depuis la tranche `05`, la promotion se fait en ligne de commande. La placer plus tôt reviendrait à travailler la vitrine avant que le magasin existe.

Elle vient après `09` parce qu'elle réutilise les états d'écran et le traitement des mutations qui y ont été validés.

**Rappel de périmètre, tiré du [README](../../README.md) :** pas d'agrégateur, pas de PSP, pas de webhook. On présente les choses visuellement. Le paiement réel est en v2.

---

## Contenu

### Écran d'offre — `(member)/premium`

Le message à faire passer, et il est inhabituel : **paiement unique, accès à vie, pas d'abonnement**. C'est un argument fort qu'il faut énoncer sans ambiguïté, parce que le réflexe du visiteur est de supposer un abonnement mensuel.

- Ce que débloque l'adhésion, rubrique par rubrique, avec des volumes réels si le contenu est déjà chargé.
- Le prix. Voir « À trancher ».
- Un appel à l'action vers le tunnel.

### Tunnel — écrans de mockup

1. **Récapitulatif** — ce qui est acheté, pour quel montant.
2. **Choix du moyen** — Wave, mobile money. Visuel uniquement, aucun appel externe.
3. **Fin de parcours** — voir « À trancher » sur ce que cet écran annonce.

### La règle absolue de cette tranche

> Le tunnel **ne touche à rien**. Aucune écriture en base, aucune modification de `membership`, aucune trace hors journalisation d'intention.

C'est ce qui distingue un mockup honnête d'une fausse fonctionnalité. Un tunnel qui promouvrait l'utilisateur « pour la démo » serait une **élévation de privilège gratuite**, exploitable par n'importe qui.

Cette règle est vérifiée par un test, pas par la vigilance.

### Honnêteté vis-à-vis de l'utilisateur

Le parcours ne doit pas laisser croire qu'un paiement a eu lieu. L'écran final doit être explicite — « bientôt disponible », « nous vous recontacterons » — plutôt qu'une fausse confirmation de commande. Un utilisateur qui croit avoir payé et n'obtient rien est un problème bien plus coûteux qu'un écran d'attente assumé.

### Préparer la couture v2

Sans écrire le paiement, poser les emplacements pour qu'il s'insère sans refonte :

- Un service `membershipService.grantPremium(userId, source)` — **le seul chemin** vers `membership = PREMIUM`, utilisé aujourd'hui par le script d'administration, demain par le webhook de paiement.
- Une trace d'attribution : qui, quand, par quel moyen. Utile pour l'audit dès la v1, indispensable en v2.
- Un fichier **`docs/v2-paiement.md`** — hors de `docs/pipeline-dev/`, qui est en lecture seule — décrivant le point d'insertion : où arrive le webhook, comment l'idempotence est garantie, comment la signature est vérifiée.

---

## Livrable démontrable

Un membre `FREE` ouvre `/premium`, comprend l'offre, parcourt le tunnel, arrive sur un écran de fin honnête. **Son `membership` est inchangé en base** — c'est la démonstration à faire, requête SQL à l'appui.

---

## DoD spécifique

En plus de la [DoD commune](00-methode-et-definition-of-done.md#definition-of-done-commune) :

- [ ] Test : parcourir l'intégralité du tunnel ne modifie **aucune** ligne de la table `User`.
- [ ] Test : aucune route ni Server Action publique ne permet d'atteindre `grantPremium` — recherche exhaustive des appelants.
- [ ] `grantPremium` est le seul chemin d'écriture de `membership` dans tout le projet.
- [ ] L'écran final n'affirme jamais qu'un paiement a été effectué.
- [ ] Le point d'insertion v2 est documenté.

---

## Pièges

| Piège | Conséquence | Parade |
|---|---|---|
| Promouvoir l'utilisateur « pour que la démo soit belle » | Élévation de privilège offerte à tous | Le tunnel n'écrit rien, vérifié par un test |
| Fausse confirmation de paiement | Utilisateurs qui croient avoir payé, litiges | Écran de fin explicite sur l'indisponibilité |
| Logos Wave / opérateurs sans autorisation | Problème de marque | Se limiter à des mentions textuelles tant que l'usage n'est pas validé |
| Prix codé en dur dans un composant | Introuvable le jour où il change | Une constante unique, ou un champ de configuration |
| Écrire un faux webhook « pour préparer » | Une route non authentifiée qui promeut des comptes | Documenter le point d'insertion, ne rien exposer |

---

## À trancher

- **Le prix, et son affichage.** Montant en FCFA, affiché ou « nous contacter » en v1 ? Un montant affiché rend le mockup crédible et permet de tester le message.
- **Que fait l'écran final ?** Trois options : (a) « bientôt disponible » simple ; (b) recueil d'une manifestation d'intérêt — une ligne en base, sans engagement, qui donne une liste de prospects réels dès la v1 ; (c) redirection vers un contact WhatsApp pour un paiement manuel hors plateforme. Recommandation : **(b)**, à condition d'assumer que c'est la seule écriture du tunnel et qu'elle ne touche pas `membership`.
- **Le premium est-il visible pour un visiteur non connecté ?** Recommandation : oui, l'offre doit être lisible avant l'inscription, sinon la conversion s'effondre.
