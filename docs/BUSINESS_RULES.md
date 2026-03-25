# CoachCRM — Règles Métier

## 1. Cycle de vie du client

### Prospect
- **Tout nouveau client** est créé avec le statut `phase: 'prospect'` (avatar violet, icône UserPlus)
- Un prospect n'a pas encore d'alliance thérapeutique confirmée

### Transition Prospect → Client
- Déclenchée automatiquement quand une séance est **complétée** (`status: 'completed'`) ET qu'un **moyen de paiement** est renseigné (`paymentMethod`)
- La phase passe de `prospect` à la première phase thérapeutique configurée (par défaut `debut`)

### Transition Client → Prospect (réversion)
- Déclenchée automatiquement quand **aucune séance restante ne valide l'alliance** (complétée + moyen de paiement)
- Exemple : si la seule séance validée est annulée, le client redevient prospect
- Les séances uniquement planifiées (sans paiement validé) ne comptent pas comme alliance

### Client inactif
- Un client est considéré comme **inactif** si aucune séance n'a eu lieu depuis un délai configurable
- Le statut inactif est calculé dynamiquement (`getComputedStatus`)

### Archivage (soft delete)
- L'archivage marque le client avec `deleted: true` et `deletedAt: <date>`
- Le client reste en base mais est masqué des vues principales
- Les clients archivés peuvent être **restaurés** ou **supprimés définitivement**

### Suppression définitive (hard delete)
- Supprime le client et toutes ses données associées : séances, comptes rendus, contacts
- Action irréversible, avec confirmation obligatoire
- Possible en sélection unitaire ou en masse (checkboxes + suppression groupée)

---

## 2. Gestion des séances

### Création
- Une séance est créée avec `status: 'scheduled'`
- La phase thérapeutique est héritée de la dernière séance du client, ou de la première phase thérapeutique par défaut
- **La phase `prospect` n'est jamais héritée** pour les séances — seules les phases thérapeutiques sont utilisées
- Les séances sont persistées dans Supabase via `createSession()`

### Auto-complétion
- Une séance planifiée dont la date+durée est passée est automatiquement marquée `completed` en affichage
- L'auto-complétion est appliquée en mémoire dans `DataContext` et dans `CoupleDetailPage`

### Annulation
- **Interdit si un moyen de paiement est renseigné** → alerte : « Veuillez d'abord supprimer le moyen de paiement »
- Si l'annulation est autorisée, les champs de paiement sont réinitialisés
- L'annulation peut déclencher la **réversion client → prospect** (voir ci-dessus)

### Rétablissement
- Une séance annulée peut être rétablie en `scheduled`

---

## 3. Dédoublonnage des séances

### Doublon même client
- Lors de la création (bouton "+ Séance"), vérification si une séance existe déjà pour **le même client le même jour**
- Alerte : « Doublon potentiel : une séance existe déjà pour ce client le [date]. Ajouter quand même ? »
- Alerte non bloquante (l'utilisateur peut confirmer)

### Autres séances le même jour
- Si aucun doublon client, vérification des séances d'**autres clients** le même jour
- Alerte informative avec les noms des clients concernés
- **Désactivée pour les prospects** (éviter le bruit lors du premier RDV)

---

## 4. Suivi financier

### Tarification
- Chaque couple/client a un tarif spécifique (`sessionRate`) configurable
- Les honoraires sont calculés : nombre de séances × tarif par séance
- Distinction entre honoraires dus, planifiés, encaissés et restant dû

### Paiement
- Moyens de paiement : chèque, virement, espèces, CB
- `paymentMethod` → moyen de paiement choisi
- `paymentReceived` → paiement effectivement reçu (boolean)
- `paymentDate` → date du paiement

### Facturation
- `invoiceDate` → date de la facture
- `invoiceCoveredSessionIds` → liste des séances couvertes par une facture groupée

---

## 5. Phases thérapeutiques

Les phases sont configurables dans les paramètres (`therapyPhases`). Par défaut :
- **Début** (`debut`) — Phase initiale, alliance thérapeutique
- **Analyse** (`analyse`) — Phase d'exploration
- **Intégration** (`integration`) — Phase de consolidation
- **Bilan final** (`bilan`) — Phase de clôture

Chaque phase a une icône et une couleur associées.

---

## 6. Sources de recrutement

Les sources de recrutement des prospects sont configurables :
- Parrainage / recommandation (par un client existant ou une personne externe)
- Bouche-à-oreille, site web, réseaux sociaux, etc.

### Parrainage
- Un parrain peut être un **client existant** ou une **personne externe** (particulier ou professionnel)
- Les liens de parrainage sont bidirectionnels (parrain ↔ filleul)
- Les personnes externes de type « particulier » sont automatiquement créées comme prospects

---

## 7. Données et persistance

### Architecture
- **Supabase** : source de vérité (PostgreSQL)
- **DataContext** : couche de traduction (snake_case ↔ camelCase) + logique métier
- **Mode démo** : données en mémoire uniquement, pas d'appels Supabase

### Tables Supabase
- `clients` — id, type, phase, status, partner_a, partner_b, start_date, deleted_at, ...
- `sessions` — id, client_id, date, duration, phase, status, payment_method, payment_received, payment_date, cancellation_reason, ...
- `reports` — id, client_id, session_id, content, ...
- `contacts` — id, client_id, type, date, notes, ...
- `professionals` — id, name, specialty, ...
