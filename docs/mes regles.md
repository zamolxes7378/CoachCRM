# Règles Métier — CoachCRM

## Cycle de vie du client

### Création
- Tout nouveau client est créé en tant que **prospect** (`phase: 'prospect'`)

### Transition Prospect → Client
- **Déclencheur** : une séance est complétée (`completed`) ET (un moyen de paiement est renseigné OU le montant est à zéro)
- Le client passe à la première phase thérapeutique (par défaut `debut`)

### Réversion Client → Prospect

#### 1. Par annulation de séance
- **Déclencheur** : une séance est annulée (`cancelled`)
- **Condition** : aucune autre séance du client ne valide l'alliance
- **Résultat** : le client redevient prospect

#### 2. Par suppression du moyen de paiement
- **Déclencheur** : le moyen de paiement d'une séance est supprimé (mis à null)
- **Condition** : aucune autre séance du client ne valide l'alliance
- **Résultat** : le client redevient prospect

> **Alliance thérapeutique** = au moins 1 séance `completed` + (`paymentMethod` renseigné OU `paymentAmount = 0`)

## Annulation de séance
- **Interdit** si un moyen de paiement est renseigné ET montant > 0 → alerte utilisateur
- Avant d'annuler, l'utilisateur doit d'abord supprimer le moyen de paiement
- **Exception** : les séances offertes (montant = 0) peuvent toujours être annulées

## Bouton « Paiement en attente »
- **N'apparaît pas** tant que le mode de paiement n'a pas été choisi ET que le montant du paiement est > 0
- Conditions requises : `paymentMethod` renseigné + `paymentAmount > 0`

## Séance offerte (montant = 0)
- Si le montant de la séance est **zéro** :
  - Les boutons de mode de paiement (Espèces, Chèque, Virement) sont **remplacés** par un badge rouge « Séance offerte »
  - Le badge en en-tête de la carte séance affiche « Séance offerte » en rouge
  - Dans le suivi financier, « Séance offerte » remplace le mode de paiement
  - Les alertes « Séance à confirmer » et « CONFIRMER » sont masquées
  - La séance **valide l'alliance** (prospect → client) même sans mode de paiement
  - La séance peut être **annulée** librement

> ⚠️ **Note technique** : `payment_amount` peut être `null` en DB. Le montant effectif est calculé par fallback : `payment_amount ?? session_rate du couple`. Toujours utiliser ce fallback pour détecter les séances offertes.

## Dédoublonnage
- Alerte si même client + même jour (bloquante avec confirmation)
- Alerte si autres clients le même jour (informationnelle, désactivée pour les prospects)

## Archivage et suppression
- **Archivage** (soft delete) : le client est masqué mais restaurable
- **Suppression définitive** (hard delete) : supprime le client + séances + CR + contacts (irréversible)
- Sélection multiple possible (checkboxes) dans les deux pages
