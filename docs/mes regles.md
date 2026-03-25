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

#### 3. Par modification du montant (séance offerte → payante)
- **Déclencheur** : le montant d'une séance passe de 0 à > 0 (et aucun moyen de paiement n'est renseigné)
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

### Affichage dans la carte séance
- Le badge en en-tête affiche **« Séance offerte »** en rouge
- L'alerte **« Séance à confirmer »** est **toujours masquée** (pas de paiement à confirmer pour cette séance)
- Le badge **« CONFIRMER »** est **toujours masqué**

### Mode de paiement (section comptable)
- **Si aucune autre séance payante n'est couverte** par ce paiement :
  - Les boutons (Espèces, Chèque, Virement) sont **remplacés** par le badge rouge « Séance offerte »
- **Si d'autres séances payantes sont couvertes** (`coveredSessionIds` contient des séances avec montant > 0) :
  - Les boutons de paiement restent **visibles** pour permettre la confirmation du paiement des séances couvertes
  - Le badge « Séance offerte » s'affiche en complément au-dessus des boutons

### Suivi financier
- « Séance offerte » remplace le mode de paiement

### Alliance thérapeutique
- La séance **valide l'alliance** (prospect → client) même sans mode de paiement
- La séance peut être **annulée** librement

> ⚠️ **Note technique** : `payment_amount` peut être `null` en DB. Le montant effectif est calculé par fallback : `payment_amount ?? session_rate du couple`. Toujours utiliser ce fallback pour détecter les séances offertes.

> ⚠️ **Comportement confirmé** :
> - Le compteur « Séances à confirmer » dans le suivi financier **inclut** les séances offertes
> - Le `paymentReceived` se propage aux séances couvertes via `coveredSessionIds` quand le paiement est confirmé

## Dédoublonnage
- Alerte si même client + même jour (bloquante avec confirmation)
- Alerte si autres clients le même jour (informationnelle, désactivée pour les prospects)

## Archivage et suppression
- **Archivage** (soft delete) : le client est masqué mais restaurable
- **Suppression définitive** (hard delete) : supprime le client + séances + CR + contacts (irréversible)
- Sélection multiple possible (checkboxes) dans les deux pages
