# Architecture Données — CoachCRM

> Ce document décrit la structure des données **actuellement implémentée** en production.
> Base de données : **PostgreSQL 17** via **Supabase** (région eu-west-2, Londres).

---

## Vue d'ensemble

CoachCRM utilise 7 tables principales, toutes protégées par **Row Level Security (RLS)**.
Chaque thérapeute ne voit que ses propres données grâce au champ `user_id` présent dans chaque table.

```
users (thérapeutes)
 ├── clients (dossiers patients)
 │    ├── sessions (séances de thérapie)
 │    │    └── reports (comptes-rendus IA)
 │    └── contacts (historique de communication)
 ├── settings (configuration personnelle)
 └── professionals (réseau professionnel)
```

---

## Tables

### 1. `users` — Thérapeutes

Stocke les utilisateurs qui se connectent via Google OAuth.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `name` | text | Nom complet (depuis Google) |
| `email` | text (unique) | Email Google |
| `role` | text | `admin` ou `therapist` |
| `photo_url` | text | Photo de profil Google |
| `created_at` | timestamptz | Date de création |

---

### 2. `clients` — Dossiers clients

Un « client » peut être un couple, un individu, ou une famille. C'est le dossier de suivi thérapeutique.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `user_id` | UUID → users | Thérapeute propriétaire |
| `type` | text | `couple`, `individual`, ou `family` |
| `partner_a` | JSONB | Identité du premier partenaire (`{ firstName, lastName, email, phone }`) |
| `partner_b` | JSONB | Identité du second partenaire (null si individuel) |
| `phase` | text | Phase thérapeutique actuelle (par défaut `prospect`) |
| `source` | text | Source de recrutement (ex: "Site web", "Parrainage") |
| `status` | text | `active`, `inactive`, ou `completed` |
| `start_date` | date | Date de début de suivi |
| `sessions_count` | integer | Nombre de séances réalisées (défaut 0) |
| `total_sessions` | integer | Objectif de séances (défaut 20) |
| `next_session` | timestamptz | Prochain RDV planifié |
| `last_session` | timestamptz | Dernier RDV réalisé |
| `emotional_maturity` | integer | Score de maturité émotionnelle (défaut 0) |
| `emotional_maturity_history` | JSONB | Historique des scores `[]` |
| `notes` | text | Notes libres du thérapeute |
| `exercises` | JSONB | Exercices assignés `[]` |
| `prospect_stage` | text | Étape dans le parcours prospect |
| `referred_by` | UUID → clients | Client parrain (auto-référence) |
| `billing_address` | text | Adresse de facturation |
| `client_links` | JSONB | Liens de parrainage entre clients `[]` |
| `external_referrer` | JSONB | Référent externe (particulier hors base) |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |
| `deleted_at` | timestamptz | Archivage (soft delete — null = actif) |

#### Structure JSONB `partner_a` / `partner_b`

```json
{
  "firstName": "Marie",
  "lastName": "Dupont",
  "email": "marie@example.com",
  "phone": "06 12 34 56 78"
}
```

#### Structure JSONB `client_links[]`

```json
[
  {
    "type": "parrainage",
    "role": "parrain",
    "clientId": "uuid-du-filleul"
  }
]
```

#### Structure JSONB `external_referrer`

```json
{
  "firstName": "Pierre",
  "lastName": "Martin",
  "phone": "06 98 76 54 32"
}
```

---

### 3. `sessions` — Séances de thérapie

Chaque séance est liée à un client et contient les informations de planification, de contenu et de paiement.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `client_id` | UUID → clients | Client concerné |
| `user_id` | UUID → users | Thérapeute |
| `date` | timestamptz | Date et heure de la séance |
| `duration` | integer | Durée en minutes (défaut 60) |
| `phase` | text | Phase thérapeutique au moment de la séance |
| `status` | text | `scheduled`, `completed`, ou `cancelled` |
| `title` | text | Titre optionnel |
| `summary` | text | Résumé / notes de séance |
| `audio_file` | text | Chemin vers l'enregistrement audio |
| `has_report` | boolean | Un compte-rendu a été généré (défaut false) |
| `cancellation_reason` | text | Motif d'annulation |
| **Comptabilité** | | |
| `payment_method` | text | Mode de paiement (especes, cheque, virement) |
| `payment_received` | boolean | Paiement encaissé (défaut false) |
| `payment_status` | text | Statut du paiement |
| `payment_amount` | numeric | Montant du paiement (null = tarif par défaut) |
| `payment_date` | date | Date d'encaissement |
| **Facturation** | | |
| `needs_invoice` | boolean | Facture demandée (défaut false) |
| `invoice_sent` | boolean | Facture envoyée (défaut false) |
| `invoice_date` | date | Date d'émission de facture |
| `invoice_covered_session_ids` | JSONB | IDs des séances couvertes par cette facture `[]` |
| `covered_session_ids` | JSONB | IDs des séances couvertes par ce paiement `[]` |
| `created_at` | timestamptz | Date de création |

---

### 4. `reports` — Comptes-rendus (générés par IA)

Analyse structurée d'une séance, générée automatiquement.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `session_id` | UUID → sessions | Séance source |
| `client_id` | UUID → clients | Client concerné |
| `couple_name` | text | Nom du couple (snapshot) |
| `session_number` | integer | Numéro de la séance |
| `date` | date | Date de la séance |
| `phase` | text | Phase thérapeutique |
| `duration` | text | Durée de la séance |
| `narrative` | text | Récit narratif de la séance |
| `themes` | JSONB | Thèmes abordés `[]` |
| `emotions_a` | JSONB | Émotions du partenaire A `[]` |
| `emotions_b` | JSONB | Émotions du partenaire B `[]` |
| `patterns` | JSONB | Schémas relationnels identifiés `[]` |
| `progress` | JSONB | Points de progrès `[]` |
| `vigilance` | JSONB | Points de vigilance `[]` |
| `exercises` | JSONB | Exercices recommandés `[]` |
| `pedagogical_content` | JSONB | Contenu pédagogique `[]` |
| `created_at` | timestamptz | Date de création |

---

### 5. `contacts` — Historique de communication

Suivi des échanges (appels, emails, SMS) avec un client.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `client_id` | UUID → clients | Client concerné |
| `user_id` | UUID → users | Thérapeute |
| `type` | text | `phone`, `email`, `sms`, `social`, ou `web` |
| `date` | timestamptz | Date du contact |
| `note` | text | Notes sur l'échange |
| `done` | boolean | Contact effectué (défaut false) |
| `created_at` | timestamptz | Date de création |

---

### 6. `settings` — Configuration utilisateur

Stocke les préférences personnalisées de chaque thérapeute (tarifs, sources, phases).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `user_id` | UUID (unique) → users | Un seul enregistrement par thérapeute |
| `session_rates` | JSONB | Tarifs par type : `{ "couple": 75, "individual": 60 }` |
| `recruitment_sources` | JSONB | Liste des sources : `["Site web", "Parrainage", ...]` |
| `therapy_config` | JSONB | Configuration : `{ "totalSessions": 20 }` |
| `therapy_phases` | JSONB | Phases thérapeutiques personnalisées |
| `default_therapy_config` | JSONB | Configuration par défaut si non spécifié |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |

---

### 7. `professionals` — Réseau professionnel

Carnet d'adresses des professionnels partenaires (médecins, avocats, etc.).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `user_id` | UUID → auth.users | Thérapeute propriétaire |
| `first_name` | text | Prénom |
| `last_name` | text | Nom |
| `email` | text | Email |
| `phone` | text | Téléphone |
| `company` | text | Cabinet / entreprise |
| `specialty` | text | Spécialité |
| `address` | text | Adresse |
| `website` | text | Site web |
| `note` | text | Notes |
| `referrals` | JSONB | Orientations reçues/envoyées `[]` |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |

---

## Relations entre tables

```
users ──< clients        (un thérapeute a plusieurs clients)
users ──< sessions       (un thérapeute a plusieurs séances)
users ──< contacts       (un thérapeute a plusieurs contacts)
users ──1 settings       (un thérapeute a une configuration)

clients ──< sessions     (un client a plusieurs séances)
clients ──< contacts     (un client a plusieurs contacts)
clients ──< reports      (un client a plusieurs comptes-rendus)
clients ──? clients      (un client peut parrainer d'autres clients via referred_by)

sessions ──< reports     (une séance peut avoir un compte-rendu)
```

---

## Sécurité (RLS)

Toutes les tables ont **Row Level Security activé**. En développement, une politique permissive `Dev: public access` est en place. En production, les politiques doivent filtrer par `user_id` pour garantir l'isolation des données entre thérapeutes.

---

## Adaptation App ↔ Base de données

L'application React utilise du **camelCase** (ex: `partnerA`, `coupleId`), tandis que la base PostgreSQL utilise du **snake_case** (ex: `partner_a`, `client_id`).

La conversion est gérée automatiquement par les fonctions `adaptClient` / `unadaptClient` (et équivalents pour sessions, reports, professionals) dans `src/context/DataContext.jsx`.

| App (camelCase) | DB (snake_case) |
|-----------------|-----------------|
| `partnerA` | `partner_a` |
| `coupleId` | `client_id` |
| `startDate` | `start_date` |
| `paymentMethod` | `payment_method` |
| `hasReport` | `has_report` |
| `clientLinks` | `client_links` |
| ... | ... |
