# Couture du paiement Premium en v2

La v1 ne contient aucun paiement, webhook ni endpoint public capable d’attribuer
le statut `PREMIUM`. Le parcours `/premium` copie une demande de contact puis
ouvre une conversation WhatsApp sans donnée personnelle dans l’URL.

## Point d’entrée futur

Le prestataire de paiement appellera un Route Handler de webhook dédié. Cette
route n’existe pas en v1. Elle devra lire le corps brut, vérifier la signature
cryptographique selon la documentation du prestataire, puis rejeter toute
requête invalide avant de parser ou de traiter l’événement.

## Idempotence et attribution

Chaque événement accepté devra porter un identifiant stable du prestataire,
enregistré sous contrainte unique dans une transaction. Un événement déjà vu
sera acquitté sans nouvelle écriture métier. Après vérification du paiement et
résolution interne du compte concerné, le traitement appellera exclusivement
`membershipService.grantPremium(userId, source)`.

Cette couture conserve deux invariants : la promotion et sa trace
`MembershipGrant` restent transactionnelles, et un compte déjà `PREMIUM` ne
produit pas une nouvelle attribution. Aucun identifiant utilisateur fourni sans
preuve par le client ne pourra servir de cible.

## Exploitation sûre

La réponse au webhook doit être générique, sans secret ni détail de base de
données. Les journaux structurés ne doivent contenir ni signature, ni donnée de
paiement sensible, ni contenu Premium. Les échecs transitoires doivent pouvoir
être rejoués grâce à l’identifiant idempotent, sans contourner la vérification de
signature ni appeler une autre primitive d’écriture du statut.
