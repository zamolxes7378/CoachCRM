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

## Création de séance (modale Accueil)

### Champs obligatoires
- **Client** : sélection obligatoire parmi les clients actifs (prospects exclus)
- **Date** : par défaut = date du jour
- **Heure** : par défaut = heure entière (XX:00) qui précède l'instant actuel
- **Note de préparation** : optionnel

### Comportement UI
- Pas de ligne horizontale entre les sections de la modale
- Si aucun client ne correspond à la recherche : afficher « Aucun client trouvé »
- Si une séance existe déjà pour le même client + même jour : alerte doublon
- Si d'autres séances existent le même jour (autre client) : alerte informative

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
- **Champs masqués** : « Montant du paiement » et « Séances concernées par ce paiement » sont **cachés**

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

## Champs numériques
- **Zéros en début de saisie** : interdit (ex: `007` → `7`, `00` → `0`)
- La valeur `0` reste autorisée (ex: séance offerte)
- Appliqué globalement via un listener sur tous les `input[type="number"]`

## Parrainage

### 3 niveaux de référencement
1. **Client → Client** (type `parrainage`, roles `parrain`/`filleul`) — liens bidirectionnels via `clientLinks[]`
2. **Externe particulier → Client** — crée un prospect automatiquement + liens bidirectionnels
3. **Professionnel externe → Client** (type `parrainage-pro`) — lien avec le réseau pro

### Validation à la création d'un client
- Si source = `parrainage` ou `referral`, le champ **« Orienté par »** est **obligatoire** (client existant OU externe avec nom renseigné)
- Le bouton « Créer le client » est **désactivé** tant que cette condition n'est pas remplie

### Anti-doublons et intégrité
- Anti auto-parrainage : un client ne peut pas se parrainer lui-même
- Détection de boucle : A parrain de B ET B parrain de A → interdit
- Doublon de lien : un même lien ne peut pas être créé deux fois

### Nettoyage automatique
- Changement de source (≠ parrainage) → supprime tous les liens de parrainage + `externalReferrer`
- Suppression d'un lien filleul → suppression du lien inverse chez le parrain

### Persistance
- `clientLinks` persisté en DB via colonne `client_links` (JSONB)
- `externalReferrer` persisté en DB via colonne `external_referrer` (JSONB)

## Avatars
- **Client inactif** : initiales en **blanc** sur fond `primary-200`
- **Prospect** : initiales en `#6B46C1` sur fond `#E8D8FE`
- **Client actif** : initiales en blanc sur fond `accent-main`
