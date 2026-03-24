# CoachCRM — Règles Métier & Techniques

> Document de référence consolidant toutes les règles métier et techniques actuellement implémentées dans CoachCRM.
> Dernière mise à jour : 24 mars 2026

---

## 1. Modèle de données

### 1.1 Client (Couple / Individuel)

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique (`c1`, `c2`…) |
| `type` | `'couple'` \| `'individual'` | Type de suivi. Par défaut : couple |
| `partnerA` | objet | Prénom, Nom, Email, Téléphone (obligatoire) |
| `partnerB` | objet \| `null` | Partenaire B. `null` = suivi individuel |
| `phase` | string | Phase thérapeutique en cours |
| `source` | string | Source de recrutement (clé) |
| `status` | string | Statut manuel : `active`, `inactive`, `completed` |
| `startDate` | date ISO | Date de premier contact |
| `totalSessions` | number | Nombre total de séances prévu (défaut : 20) |
| `sessionsCount` | number | Nombre de séances effectuées |
| `emotionalMaturity` | number | Score de maturité émotionnelle (0-100) |
| `emotionalMaturityHistory` | number[] | Historique des scores |
| `notes` | string | Notes globales du dossier |
| `exercises` | array | Exercices assignés (titre, statut, date limite) |
| `referredBy` | string \| undefined | ID du client parrain (parrainage) |
| `prospectStage` | string | Étape dans le pipeline prospect |
| `sessionFrequency` | number | Fréquence des séances (en séances/mois, défaut : 2) |
| `clientLinks` | array | Liens vers d'autres dossiers (parrainage, dossier lié) |
| `externalReferrer` | objet \| `null` | Référent externe (particulier ou professionnel) |

#### Règles :
- **Partenaire B optionnel** : si `partnerB` est `null`, c'est un suivi individuel
- **Nom d'affichage** : `Prénom_A et Prénom_B NomFamille` (couple) ou `Prénom Nom` (individuel)
- **Initiales** : `A[0]B[0]` (couple) ou `P[0]N[0]` (individuel), toujours en **MAJUSCULE**
- **Initiales null-safe** : si `partnerA`, `lastName` ou `firstName` est null/undefined/vide, fallback à `'?'` — ne jamais crasher
- **Adresse de facturation** : stockée dans chaque partenaire (`partnerA.billingAddress`, `partnerB.billingAddress`), pas au niveau client
- **Type famille** : si `type === 'family'` et `children.length === 0`, auto-rétrogradé en `'couple'`

### 1.2 Séance (Session)

| Champ | Type | Description |
|---|---|---|
| `id` | string | Identifiant unique |
| `coupleId` | string | Référence au client |
| `date` | datetime ISO | Date et heure de la séance |
| `duration` | number | Durée en minutes |
| `phase` | string | Phase thérapeutique de la séance |
| `status` | `'scheduled'` \| `'completed'` \| `'cancelled'` | Statut |
| `audioFile` | string \| `null` | Fichier audio du dictaphone |
| `hasReport` | boolean | Compte-rendu disponible |
| `title` | string | Titre de la séance |
| `summary` | string | Résumé court |
| `paymentMethod` | `'especes'` \| `'cheque'` \| `'virement'` \| `null` | Mode de paiement |
| `paymentReceived` | boolean | Paiement encaissé |
| `paymentStatus` | `'deferred'` \| undefined | Paiement différé |
| `paymentAmount` | number \| undefined | Montant personnalisé (sinon tarif par défaut) |
| `needsInvoice` | boolean | Facture à émettre |
| `invoiceSent` | boolean | Facture envoyée |

### 1.3 Compte-rendu (Report)

| Champ | Type | Description |
|---|---|---|
| `narrative` | string | Récit de la séance |
| `themes` | string[] | Thèmes abordés |
| `emotionsA` / `emotionsB` | string[] | Émotions de chaque partenaire |
| `patterns` | string[] | Schémas relationnels identifiés |
| `progress` | string[] | Points de progrès |
| `vigilance` | string[] | Points de vigilance |
| `exercises` | string[] | Exercices donnés |
| `pedagogicalContent` | string[] | Contenus pédagogiques partagés |

---

## 2. Parcours thérapeutique

### 2.1 Phases de thérapie (séquentielles)

> **Règle fondamentale : les phases sont séquentielles.** Il faut passer par toutes les étapes précédentes pour arriver à une étape ultérieure.

| # | Clé | Label | Couleur | Icône |
|---|---|---|---|---|
| 1 | `debut` | Début | `#2B6CB0` (bleu) | Sprout 🌱 |
| 2 | `analyse` | Analyse | `#E67E22` (orange) | Search 🔍 |
| 3 | `integration` | Intégration | `#276749` (vert) | Target 🎯 |
| 4 | `bilan_final` | Bilan final | `#6B46C1` (violet) | Award 🏆 |

#### Règles :
- **Progression séquentielle** : Début → Analyse → Intégration → Bilan final
- **Personnalisable** : les phases peuvent être renommées, ajoutées ou supprimées dans les Paramètres et l'Onboarding
- **Minimum 1 phase** : impossible de supprimer la dernière phase restante
- **Chaque séance a sa propre phase**, indépendante de la phase globale du client
- **Sélecteur de phase en stepper** : dans le détail d'une séance ET dans le modal d'édition d'identité, la sélection de phase utilise un indicateur horizontal de type stepper (icônes + labels + traits de connexion + soulignement coloré pour la phase active + checkmarks pour les phases précédentes). Le style est **identique** dans les deux modales.
- **Clé générée automatiquement** : `label.lowercase().normalize().replace(accents+spéciaux → '_')`

### 2.2 Phases spéciales (hors parcours)

| Clé | Label | Usage |
|---|---|---|
| `prospect` | Prospect | Client potentiel, pas encore en thérapie |
| `completed` | Terminé | Suivi thérapeutique terminé |

---

## 3. Pipeline prospect

### 3.1 Étapes du pipeline

| # | Clé | Label | % d'avancement | Couleur |
|---|---|---|---|---|
| 1 | `first_contact` | Premier contact | 25% | `#D6BCFA` |
| 2 | `discovery_call` | Appel découverte | 50% | `#B794F4` |
| 3 | `appointment_set` | RDV découverte fixé | 75% | `#9F7AEA` |
| 4 | `converted` | Converti | 100% | `#6B46C1` |

### 3.2 Règles prospects

- **`prospect` n'est PAS une phase de thérapie** — c'est un statut spécial (`couple.phase === 'prospect'`)
- Un prospect **n'a pas** de séances planifiées ni complétées
- Un prospect **peut avoir des contacts** (appels, emails, SMS, etc.)
- Un prospect **peut parrainer** d'autres clients
- Un prospect **peut se voir attribuer n'importe quelle phase de thérapie** (ex : "Début", "Intégration") dès sa création via le dropdown "Phase de la thérapie" ou via le stepper dans la modale identité
- **Le stepper de phase est visible pour TOUS les clients**, y compris les prospects
- **Conversion automatique** : un prospect devient automatiquement client lorsque sa **première séance est marquée "complétée"**. Sa phase passe de `'prospect'` à `defaultPhaseKey` (première phase de `therapyPhasesData`)
- La source de recrutement est renseignée à la création
- Le parrainage (`referredBy`) permet de lier un prospect à un client existant
- L'affichage se fait dans un onglet séparé "Prospects" (vs "Clients")

### 3.3 Source de vérité unique (centralisation)

| Donnée | Source | Exposé via |
|---|---|---|
| Phases de thérapie | `therapyPhasesData` (Paramètres → DB) | `useData().therapyPhases` |
| Icônes de phase | `DataContext.phaseIcons` | `useData().phaseIcons` |
| Couleurs de phase | `DataContext.phaseColors` | `useData().phaseColors` |
| Phase par défaut | `therapyPhasesData[0].key` | `useData().defaultPhaseKey` |

> **Aucune page ne doit définir ses propres `phaseIcons`, `phaseColors` ou fallback `'debut'` en dur.** Tout passe par `useData()`.

---

## 4. Statut du client

### 4.1 Calcul du statut (`getComputedStatus`)

```
1. Si statut manuel = 'inactive' → inactive
2. Si statut manuel = 'completed' et phase = 'prospect' → inactive
3. Si statut manuel = 'completed' → completed
4. Si a un RDV futur → active
5. Si pas de dernière séance ni date de début → statut manuel ou active
6. Si dernière activité < 3 mois → active
7. Si dernière activité ≥ 3 mois → inactive (automatique)
```

> **Règle des 3 mois** : un client sans activité depuis plus de 3 mois est automatiquement considéré comme inactif.

### 4.2 Toggle actif/inactif

- Disponible sur la fiche client en haut à droite
- Le statut manuel (`active` / `inactive`) a priorité sur le calcul automatique
- Le statut `completed` marque la fin du suivi

---

## 5. Gestion des séances

### 5.1 Création de séance

- **Client requis** : soit un client existant (non-prospect), soit un nouveau client créé en ligne
- **Date et heure requises**
- **Confirmation date passée** : si la date choisie est dans le passé, une confirmation est demandée
- **Détection de doublons** : alerte si une séance existe déjà pour le même client à la même date
- **Phase héritée** : une nouvelle séance hérite la phase de la séance la plus récente, sinon `'debut'`
- **Note de préparation** : champ optionnel pour préparer les thèmes de la séance

### 5.2 Numérotation des séances

- **Chronologique par cycle** : les séances sont numérotées dans l'ordre de leur date, par cycle thérapeutique
- Les séances annulées ne sont **pas comptées** dans la numérotation
- Chaque nouveau cycle de thérapie repart de la séance 1

### 5.3 Cycles de thérapie

- Un client peut avoir **plusieurs cycles** (ex : Thérapie #1, Thérapie #2)
- Chaque cycle a : `startDate`, `rate` (tarif), `totalSessions`, `phase`
- Le cycle actif est le dernier dans la liste
- Bouton "Nouvelle thérapie" pour démarrer un nouveau cycle

### 5.4 Statuts des séances

| Statut | Signification | Visuel |
|---|---|---|
| `scheduled` | Planifiée (future) | Bordure pointillée, fond blanc |
| `completed` | Effectuée | Fond bleu clair |
| `cancelled` | Annulée | Fond rouge clair, texte rouge |

### 5.5 Enregistrement audio / Dictée

- Bouton "Dicter" dans le détail de la séance
- Simulation d'enregistrement en 3 étapes : `recording` → `processing` → `done`
- Le contenu dicté est injecté dans le champ texte de compte-rendu
- Indication "Vous pouvez dicter plusieurs fois pour compléter le texte"

### 5.6 Amélioration IA du texte

- Bouton ✨ "Améliorer" pour reformuler le texte dicté via IA (simulation)
- Disponible uniquement quand du texte est présent

---

## 6. Paiements et facturation

### 6.1 Modes de paiement

| Mode | Clé | Règle d'encaissement |
|---|---|---|
| Espèces | `especes` | **Considéré comme reçu immédiatement** |
| Chèque | `cheque` | En attente jusqu'à confirmation manuelle |
| Virement | `virement` | En attente jusqu'à confirmation manuelle |

### 6.2 Tarification

- **Tarif couple** : 75€ par défaut (configurable)
- **Tarif individuel** : 60€ par défaut (configurable)
- **Tarif par cycle** : chaque cycle thérapeutique a son propre tarif
- **Override par séance** : possibilité de définir un tarif spécifique pour une séance individuelle
- **Formule** : `rateOverrides[sessionId] ?? sessionRate` (override local > tarif du cycle)

### 6.3 Règles de paiement

- Un paiement peut couvrir **plusieurs séances** (sélection par checkboxes)
- **Paiement en attente** : séance complétée sans méthode de paiement renseignée → alerte ⚠️
- **Paiement différé** : `paymentStatus === 'deferred'` → marqué avec icône sablier
- Montant du paiement (`paymentAmount`) : personnalisable, sinon tarif par défaut

### 6.4 Facturation

- `needsInvoice` : flag pour marquer une séance comme nécessitant une facture
- `invoiceSent` : flag pour confirmer l'envoi de la facture
- La facturation peut couvrir **plusieurs séances** avec auto-calcul du montant
- Alerte visuelle pour les factures en attente d'émission

### 6.5 Suivi financier (page Finances)

- **CA réalisé** : somme des montants des séances complétées
- **CA prévisionnel** : CA réalisé + séances planifiées × tarif par défaut
- **Taux d'encaissement** : `encaissé / CA réalisé × 100`
- **Objectif CA mensuel** : configurable par année (défaut : 2000€)
- **Nouveaux clients** : client dont la 1ère séance (non annulée) est dans le mois en cours
- Vues : mois, trimestre, semestre, année

---

## 7. Alertes et notifications

### 7.1 Dashboard (aperçu rapide)

| Alerte | Calcul |
|---|---|
| Clients actifs | `phase ≠ 'prospect'` ET `computedStatus = 'active'` |
| Prospects actifs | `phase = 'prospect'` ET `computedStatus = 'active'` |
| CR en attente | Séances `completed` sans `hasReport` |
| Factures en attente | `needsInvoice` ET non `invoiceSent` |
| Paiements en attente | `completed` ET (`!paymentMethod` OU (`paymentMethod ≠ 'especes'` ET `!paymentReceived`)) |
| Clients parrains | Clients ayant au moins un `referredBy` pointant vers eux |

### 7.2 Alertes Suivi financier

- Affichées en haut à droite, texte gris discret (pas de fond)
- Icônes harmonisées avec les autres zones d'alerte

---

## 8. Sources de recrutement

### 8.1 Sources par défaut

| Clé | Label |
|---|---|
| `website` | Site web |
| `phone` | Téléphone |
| `referral` | Parrainage |
| `email` | Email |
| `social` | Réseaux sociaux |

### 8.2 Règles

- **Liste configurable** : ajout, renommage, suppression dans Paramètres et Onboarding
- **Minimum 1 source** : impossible de supprimer la dernière
- **Source « Parrainage »** : déclenche un champ additionnel "Recommandé par" pour lier un client existant
- **Pas de création à la volée** : le formulaire "Nouveau couple" utilise la liste prédéfinie, sans option d'ajout

---

## 9. Onboarding Wizard

### 9.1 Déclenchement

- **À chaque connexion** : le wizard s'affiche après l'authentification
- Bouton "Passer" disponible dès la première étape
- L'utilisateur peut compléter partiellement et quitter

### 9.2 Étapes (4 étapes séquentielles)

| # | Icône | Label | Contenu |
|---|---|---|---|
| 1 | ❤️ Heart | Bienvenue | Message d'accueil, logo CoachCRM au-dessus du texte |
| 2 | 📚 Layers | Parcours | Configuration des phases + nombre de séances par défaut |
| 3 | 💶 Euro | Tarifs | Tarifs couple et individuel |
| 4 | 👥 Users | Sources | Sources de recrutement |

### 9.3 Règles UX

- **Design** : fond bleu marine (gradient `primary-800` → `primary-900`), carte blanche centrée
- **Indicateur de progression** : stepper horizontal avec icônes, labels, connexions, soulignement doré pour l'étape active, checkmarks pour les étapes passées
- **Boutons** : style `btn-accent` (doré), coins carrés (`radius-md`)
- **Animation** : slide gauche/droite entre les étapes
- **Navigation libre** : cliquer sur n'importe quelle étape dans l'indicateur
- **Données modifiées en temps réel** : les changements de phases, tarifs et sources sont appliqués immédiatement au modèle de données partagé

---

## 10. Paramètres (SettingsPage)

### 10.1 Sections

| Section | Contenu |
|---|---|
| Google Calendar | Synchronisation bidirectionnelle (import RDV, création événements, rappels, annulations) |
| Parcours thérapeutique | Mêmes fonctionnalités que l'onboarding (étape 2) : phases + séances par défaut |
| Tarifs | Tarifs couple et individuel |
| Sources de recrutement | Gestion de la liste des sources |
| Notifications | Rappels de séance, rapports en attente, facturation |

---

## 11. Contacts hors-séance

### 11.1 Types de contact

| Type | Icône |
|---|---|
| `phone` | Phone 📞 |
| `email` | Mail 📧 |
| `sms` | MessageSquare 💬 |

### 11.2 Règles

- Les contacts apparaissent dans la timeline du client, mêlés aux séances
- Chaque contact a : type, date, note
- Possibilité d'ajouter, modifier, supprimer un contact
- Les contacts n'affectent pas le comptage des séances

---

## 12. Timeline et filtres

### 12.1 Structure de la timeline

- **Combinaison** de séances + contacts, triés par date décroissante
- **Séparateurs de cycle** : si le client a plusieurs cycles de thérapie
- **Filtre par phase** : boutons pour filtrer les séances par phase thérapeutique
- **Barre de progression multi-phases** : affiche visuellement les séances effectuées et planifiées par phase

### 12.2 Affichage conditionnel

- **Prochain RDV** affiché si le client est actif et a une séance future
- **Dernier RDV** affiché si le client est inactif ou terminé

---

## 13. Recherche et tri

### 13.1 Dashboard

- Recherche par nom de client
- Recherche par date (±3 jours)
- Filtre "Factures en attente"
- Filtre "Paiements en attente"
- Les filtres sont cumulatifs

### 13.2 Page Clients

- Recherche textuelle par nom
- Filtres : Tous, Actifs, Inactifs, Suivi terminé, Individuel, Parrains
- Tri : A→Z / Z→A (alphabétique par nom de famille), Plus récent
- Vues : Cartes ou Liste

---

## 14. Rôles et accès

| Rôle | Accès |
|---|---|
| `admin` | Toutes les pages, y compris `/admin` |
| `therapist` | Toutes les pages sauf `/admin` (redirection vers Dashboard) |

- La page Admin affiche la liste des thérapeutes (nom, email, rôle, couples, séances, dernière activité, statut)

---

## 15. Navigation et routing

| Route | Page |
|---|---|
| `/` | Dashboard |
| `/couples` | Liste des clients/prospects |
| `/couples/:id` | Fiche détaillée du client |
| `/sessions` | Sessions (placeholder) |
| `/finances` | Suivi financier |
| `/settings` | Paramètres |
| `/admin` | Administration (admin uniquement) |
| `*` | Redirection vers `/` |

---

## 16. Conventions techniques

### 16.1 Stack

- **React** avec hooks (useState, useEffect, useRef, useMemo)
- **React Router** v6 (BrowserRouter, Routes, Route, useParams, useNavigate, useSearchParams)
- **Lucide React** pour les icônes
- **CSS** vanilla avec variables CSS personnalisées
- **Vite** comme bundler

### 16.2 Conventions de nommage

- Composants : PascalCase (`CoupleDetailPage`, `OnboardingWizard`)
- Clés de données : snake_case (`bilan_final`, `first_contact`)
- Variables d'état : camelCase (`phaseDropdownOpen`, `sessionUpdates`)
- Couleurs : système de tokens CSS (`--primary-800`, `--accent-main`, `--text-secondary`)

### 16.3 Formats

- **Dates** : ISO 8601 (`2026-03-22T14:00:00`)
- **Affichage dates** : `fr-FR`, format long (`22 mars 2026`)
- **Heures** : format 24h (`14:00`)
- **Monnaie** : Euro (€), pas de centimes par défaut
- **Langue** : Français (UI entièrement en français)

---

## 17. Synthèse IA du dossier

- Bouton "Générer" pour créer une synthèse IA à partir des comptes-rendus disponibles
- La synthèse utilise les CR existants comme source
- Disponible uniquement si au moins 1 CR existe

---

## 18. Notes du dossier

### 18.1 Notes catégorisées

| Catégorie | Champ |
|---|---|
| Dynamique relationnelle | `noteDynamique` |
| Axes de travail | `noteAxes` |
| Points de vigilance | `noteVigilance` |
| Objectifs | `noteObjectifs` |

### 18.2 Note de préparation de séance

- Champ texte dans le détail de la séance
- Permet au thérapeute de préparer les thèmes avant la séance

---

## 19. Règles visuelles et UX

### 19.1 Avatars clients

| Statut / Phase | Fond | Texte |
|---|---|---|
| Client actif (non-prospect) | `var(--accent-main)` | Blanc |
| **Client inactif** | **`var(--primary-200)` (gris clair)** | **`var(--text-tertiary)`** |
| Prospect | `#E8D8FE` (mauve clair) | `#6B46C1` (violet) |
| Terminé / Complété | `var(--primary-200)` | `var(--text-tertiary)` |

> **Règle : un client inactif a TOUJOURS un avatar gris clair**, quelle que soit sa phase. La vérification inactive a priorité sur la phase.

### 19.2 Couleur prospect `#E8D8FE`

- Appliquée à **tous** les avatars prospects dans l'application :
  - Cartes clients (`CouplesPage`, vue cartes ET vue liste)
  - Fiche détaillée (`CoupleDetailPage`, page ET modal d'édition)
  - Badges et bordures liés aux prospects
- Assure la **continuité graphique** entre les vues

### 19.3 Icône d'édition

- Le crayon (`Edit3`) est **toujours visible** (opacité 50%) à côté du nom du client sur la fiche détaillée
- Pas besoin de survol pour le voir

### 19.4 Champs obligatoires

- Les champs obligatoires (ex : Nom) ont un **liseret rouge** (`borderColor: var(--error)`) quand ils sont vides
- Le bouton Enregistrer est **désactivé** (opacity 0.4 + disabled) si un champ obligatoire est vide :
  - Nom du partenaire A (toujours)
  - Nom du partenaire B (si couple ou famille)
  - Nom du référent (si source parrainage)

### 19.5 Comportement modal d'édition d'identité

- **Annuler** : réinitialise TOUS les champs aux valeurs originales du couple
- **Clic extérieur (backdrop)** : affiche `window.confirm('Des modifications non enregistrées seront perdues...')` si des modifications ont été détectées, puis réinitialise les champs
- **Détection des modifications** (`hasChanges`) : compare prénom, nom, email, téléphone (partenaires A et B), source, et adresse de facturation par partenaire
- **Enregistrer** : utilise des variables locales (`updatedPartnerA`, `updatedPartnerB`) puis applique au couple en mémoire + `updateClient()` vers Supabase

---

## 20. Programmation défensive

### 20.1 Règles anti-crash

- **`getCoupleInitials()`** : null-safe — gère `partnerA === null`, `lastName === ''`, `firstName === undefined` avec fallback `'?'`
- **`getCoupleName()`** : null-safe — même protection
- **Toutes les fonctions data-driven** : doivent gérer les cas où les données Supabase sont incomplètes (champs null, objets manquants)
- **`.toUpperCase()`** ne doit JAMAIS être appelé sur `undefined` — toujours vérifier en amont

### 20.2 Création de client

- Le formulaire de création envoie **partnerA ET partnerB** (si couple/famille) avec tous les champs contrôlés (état React)
- L'adresse de facturation est incluse **dans chaque partenaire** (`partnerA.billingAddress`, `partnerB.billingAddress`)
- Le Nom est toujours converti en **MAJUSCULES** via `.toUpperCase()` avant l'envoi
