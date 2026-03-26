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

### Valeurs par défaut
- **Date** : par défaut = date du jour
- **Heure** : par défaut = heure entière (XX:00) qui précède l'instant actuel
- **Note de préparation** : optionnel

### Comportement UI
- Pas de ligne horizontale entre les sections de la modale
- Si aucun client ne correspond à la recherche : afficher « Aucun client trouvé »
- Si une séance existe déjà pour le même client + même jour : alerte doublon
- Si d'autres séances existent le même jour (autre client) : alerte informative

### Limite de planification
- **Maximum 6 mois dans le futur** : l'input date est limité via `max`, le bouton de création est désactivé, et un message d'erreur s'affiche si la date dépasse la limite
- Pas de restriction sur les dates passées (confirmation demandée)

### Création de séance depuis la fiche client
- Le bouton « + Séance » crée la séance avec les valeurs par défaut (date = aujourd'hui, heure = heure courante, phase héritée) et **ouvre immédiatement le panneau SessionDetailModal** (le grand panneau avec phase, date, note, dictée, données comptables, facturation)
- L'utilisateur peut ensuite modifier la date, l'heure, la note de préparation et les données comptables
- La limite de 6 mois s'applique sur le champ date du SessionDetailModal

### Phase héritée
- La nouvelle séance hérite de la **phase de la dernière séance** du client (si elle existe)
- Sinon, hérite de la **phase du client** (sauf si prospect)
- **Première séance d'un prospect** → phase = première phase thérapeutique configurée (par défaut : `début`)

## Complétion automatique de séance

### Conditions (les 2 sont obligatoires)
1. **Date + durée ≤ maintenant** : la séance est dans le passé
2. **Condition de paiement** : un moyen de paiement est renseigné (`paymentMethod` ≠ null) **OU** le montant est à 0 (séance offerte)

### Déclenchement
- Au **chargement de l'application** (pour toutes les séances `scheduled` remplissant les 2 conditions)
- Lors d'une **mise à jour de séance** (ex: choix du moyen de paiement → complétion automatique)

### Ce qui ne déclenche PAS la complétion
- La rédaction d'un compte-rendu (CR)
- La modification de notes
- Tout update qui ne concerne pas le paiement

> ⚠️ **Règle absolue** : une séance passée **reste** en statut `scheduled` tant que la condition de paiement n'est pas remplie. Elle apparaît alors avec le badge « CONFIRMER » et le bouton « Rédiger CR ».


## Signalétique des séances passées non confirmées

### Définition
Une séance est considérée « passée » dès que `date de la séance ≤ maintenant`, indépendamment de son `status` technique (`scheduled` ou `completed`).

### Conditions d'activation
- La séance est passée
- Le mode de paiement n'est **pas** renseigné (`paymentMethod` = null)
- Le montant effectif est **> 0** (exclut les séances offertes)
- Le statut n'est **pas** `cancelled`

### Éléments visuels obligatoires (les 3 ensemble)
1. **Badge « CONFIRMER »** — affiché dans la ligne d'info, couleur ambre `#D97706`
2. **Message d'alerte** — texte : *« Séance à confirmer — Veuillez renseigner le mode de paiement. »*, même couleur
3. **Bouton « Rédiger CR »** — affiché à droite de la carte, fond `#FFF3E0`, couleur `#E67E22`
4. **Icône ⚠️** — triangle d'avertissement en coin droit (pour les séances `scheduled` passées sans CR)

> ⚠️ **Règle absolue** : ces 3 éléments doivent **toujours** apparaître ensemble pour toute séance passée non confirmée. Il ne doit jamais y avoir de séance passée avec l'icône ⚠️ seule sans le badge et le message.

### Synchronisation inter-pages
Cette signalétique est **identique** sur toutes les vues grâce au composant partagé `src/components/session/SessionCard.jsx` :
- **Page d'accueil** (calendrier des séances) — `showClientName={true}`
- **Page client** (timeline thérapie) — `showClientName={false}, showExpandedStyle={true}`
- **Modale détail séance**
- **Suivi financier** (détail par séance)

> ⚠️ **Règle absolue** : toute modification visuelle de carte de séance doit se faire exclusivement dans `SessionCard.jsx`. Il est strictement interdit de dupliquer le JSX de rendu dans les pages.

Toute modification de la signalétique doit être répercutée sur **toutes** ces vues simultanément.

## Annulation de séance
- **Interdit** si un moyen de paiement est renseigné ET montant > 0 → alerte utilisateur
- Avant d'annuler, l'utilisateur doit d'abord supprimer le moyen de paiement
- **Exception** : les séances offertes (montant = 0) peuvent toujours être annulées

### Suppression définitive de séance annulée
- L'icône **XCircle** sur les séances annulées est un **bouton cliquable** qui supprime définitivement la séance
- **Confirmation obligatoire** via le ConfirmDialog (variant `destructive`)
- La séance disparaît du **timeline** et du **calendrier** après suppression
- Fonctionne sur les **2 vues** : timeline client (CoupleDetailPage) et calendrier d'accueil (DashboardPage)
- Implémenté via `onDelete` dans `SessionCard.jsx` avec `stopPropagation` (ne déclenche pas l'ouverture du détail)

## Suppression groupée de séances (accueil)
- Disponible uniquement sur l'onglet **« En cours »** du calendrier d'accueil
- L'utilisateur active le **mode sélection** via le bouton « Sélectionner »
- En mode sélection : clic sur une carte = sélection/désélection (pas de navigation)
- Une **barre d'action flottante** affiche le nombre de séances sélectionnées
- Boutons : « Tout sélectionner / Tout désélectionner » + « Supprimer (N) »
- La suppression déclenche une **confirmation obligatoire** via le ConfirmDialog
- **Cascade** : les reports liés aux séances supprimées sont également supprimés
- **Vérification d'alliance** : après suppression, pour chaque client affecté, le système vérifie si des séances restantes valident l'alliance thérapeutique. Si aucune séance ne la valide, le client redevient automatiquement **prospect**
- Après suppression, le mode sélection se désactive automatiquement

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

> ⚠️ **Note technique — Calcul du montant effectif** :
> Le montant d'une séance est déterminé par `getRate()` dans `useSessionModalState.js`, avec la priorité suivante :
> 1. `rateOverrides[sessionId]` — modification en cours (volatile, mémoire uniquement)
> 2. `session.paymentAmount` — montant persisté en DB (même si = 0 pour séance offerte)
> 3. `originalRate` / `sessionRate` — tarif par défaut du client (fallback)
>
> **Règle absolue** : ne jamais utiliser `session.paymentAmount ?? rate` directement. Toujours passer par `getRate()` pour garantir la cohérence entre le montant affiché et les badges (« Séance offerte », « CONFIRMER »).

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
- Le composant partagé **`ReferrerSection.jsx`** est utilisé à la création (CouplesPage) et à l'édition (EditIdentityModal) pour garantir un comportement identique

### Anti-doublons et intégrité
- **Détection de doublons parrains particuliers** : comparaison nom/prénom/email/phone avec les clients existants → alerte `DuplicateAlert` avec option « Lier »
- **Détection de doublons parrains professionnels** : comparaison nom/prénom avec la table `professionals` → alerte `DuplicateAlert` avec option « Lier »
- La détection s'applique partout : création ET édition (via `ReferrerSection`)
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
