# Architecture Données — CoachCRM

> Ce document décrit la structure des données **actuellement implémentée** en production.
> Base de données : **PostgreSQL 17** via **Supabase** (région eu-west-2, Londres).

---

## Vue d'ensemble

CoachCRM utilise 14 tables principales, toutes protégées par **Row Level Security (RLS)**.
Chaque thérapeute ne voit que ses propres données grâce au champ `user_id` présent dans chaque table.

```
users (thérapeutes)
 ├── clients (dossiers patients)
 │    ├── sessions (séances de thérapie)
 │    │    └── reports (comptes-rendus IA)
 │    ├── contacts (historique de communication)
 │    ├── therapy_cycles (cycles de thérapie)
 │    └── invoices (factures)
 │         └── invoice_sessions (liaison factures/séances)
 ├── settings (configuration personnelle)
 ├── professionals (réseau professionnel)
 └── roadmap_items (roadmap produit)
```

*(Note: `allowed_emails`, `retention_policies`, et `dsar_requests` sont gérées au niveau système/admin)*

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
| `type` | text | `client` (ex-couple), `individual`, ou `family` |
| `partner_a` | JSONB | Identité du premier partenaire (`{ firstName, lastName, email, phone }`) |
| `partner_b` | JSONB | Identité du second partenaire (null si individuel, présent si duo/client) |
| `children` | JSONB | Liste des enfants (présent si type famille) `[{ name, birthYear }]` |
| `referents` | JSONB | Tableau indiquant qui est le référent principal (ex: `['A']` ou `['B']`) |
| `phase` | text | Phase thérapeutique actuelle (par défaut `prospect`) |
| `source` | text | Source de recrutement (ex: "Site web", "Parrainage") |
| `status` | text | `active`, `inactive`, ou `completed` |
| `start_date` | date | Date de début de suivi (reset à NULL si < 1950) |
| `sessions_count` | integer | Nombre de séances (Valeur legacy — la UI recalcule cette valeur dynamiquement) |
| `total_sessions` | integer | Objectif de séances (défaut 20) |
| `next_session` | timestamptz | Prochain RDV planifié |
| `last_session` | timestamptz | Dernier RDV réalisé |
| `emotional_maturity` | integer | Score de maturité émotionnelle (défaut 0) |

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
| `ai_synthesis` | text | Synthèse IA globale (parcours, dynamique...) |
| `session_rate` | numeric | Tarif spécifique de ce client (facultatif) |
| `session_frequency` | integer | Fréquence des séances (par défaut 4) |
| `note_dynamique` | text | Note libre — dynamique relationnelle (**colonne canonique**) |
| `note_axes` | text | Note libre — axes de travail (**colonne canonique**) |
| `note_vigilance` | text | Note libre — points de vigilance (**colonne canonique**) |
| `note_objectifs` | text | Note libre — objectifs thérapeutiques (**colonne canonique**) |
| `anonymized_at` | timestamptz | Date d'anonymisation (purge RGPD) |
| `retention_until` | timestamptz | Échéance de conservation absolue |

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
| `client_name` | text | Nom du client (snapshot) |
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
| `session_rates` | JSONB | Tarifs par type : `{ "client": 75, "individual": 60 }` |
| `recruitment_sources` | JSONB | Liste des sources : `["Site web", "Parrainage", ...]` |
| `therapy_config` | JSONB | Configuration : `{ "totalSessions": 20 }` |
| `therapy_phases` | JSONB | Phases thérapeutiques personnalisées |
| `default_therapy_config` | JSONB | Configuration par défaut si non spécifié |
| `revenue_objectives` | JSONB | Objectifs de CA par année/mois : `{ "2026": { "0": 2000, "1": 2500 } }` |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |

#### Structure JSONB `revenue_objectives`
Les clés du premier niveau sont les années (string). Le second niveau contient les index des mois (0-11) et leurs montants respectifs.
```json
{
  "2024": { "0": 1500, "1": 1500 },
  "2025": { "0": 2000, "11": 3000 }
}
```
### 7. `therapy_cycles` — Cycles de thérapie

Stocke les différents cycles de suivi pour un même client.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `client_id` | UUID → clients | Client concerné |
| `user_id` | UUID → users | Thérapeute |
| `start_date` | date | Date de début du cycle |
| `rate` | numeric | Tarif appliqué pour ce cycle |
| `total_sessions` | integer | Objectif de séances pour ce cycle |
| `phase` | text | Phase lors de l'initialisation du cycle |
| `created_at` | timestamptz | Date de création |

---

### 8. `professionals` — Réseau professionnel

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

### 9. `invoices` — Factures clients

Système de facturation pour les clients.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `user_id` | UUID → auth.users | Thérapeute |
| `client_id` | UUID → clients | Client facturé |
| `invoice_date` | date | Date d'émission (défaut CURRENT_DATE) |
| `sent` | boolean | Facture envoyée au client (défaut false) |
| `sent_at` | timestamptz | Date d'envoi |
| `created_at` | timestamptz | Date de création |

---

### 10. `invoice_sessions` — Table de liaison (Factures ↔ Séances)

| Champ | Type | Description |
|-------|------|-------------|
| `invoice_id` | UUID → invoices | Facture concernée |
| `session_id` | UUID (unique) → sessions | Séance facturée |

---

### 11. `allowed_emails` — Whitelist (Accès)

Liste des emails autorisés à accéder ou avoir des privilèges (ex: admin).

| Champ | Type | Description |
|-------|------|-------------|
| `email` | text | Email autorisé |
| `created_at` | timestamptz | Date de création |

---

### 12. `roadmap_items` — Roadmap Produit

Gestion des tickets/tâches de la roadmap.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `user_id` | UUID → auth.users | Utilisateur créateur |
| `title` | text | Titre du ticket |
| `description` | text | Description détaillée |
| `status` | text | `backlog`, `in_progress`, ou `done` |
| `priority` | text | `low`, `medium`, `high`, `critical` |
| `category` | text | `feature`, `bug`, `design`, `legal`, `infrastructure` |
| `milestone` | text | Jalon optionnel |
| `due_date` | date | Date d'échéance |
| `sort_order` | integer | Ordre de tri |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |

---

### 13. `retention_policies` — Politique de conservation (P1-R)

Registre canonique des durées de conservation par entité/régime. Mis à jour conjointement avec `docs/retention_policy.md`.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | bigint | Identifiant auto |
| `entity` | text | Nom de la table ou catégorie logique |
| `regime` | text | Régime de conservation (`post_therapy`, `accounting`, `erasure_request`, …) |
| `retention_months` | integer | Durée en mois (0 = suppression immédiate) |
| `legal_basis` | text | Base légale (ex : RGPD Art. 17) |
| `notes` | text | Notes explicatives |
| `created_at` | timestamptz | Date de création |

---

### 14. `dsar_requests` — Demandes de droits (DSAR, P1-R)

Journal des demandes DSAR (accès, effacement, portabilité…). Accès admin uniquement via RLS.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID (auto) | Identifiant unique |
| `subject_email` | text | Email de la personne concernée |
| `request_type` | text | `access`, `erasure`, `portability`, `rectification`, `restriction` |
| `status` | text | `pending`, `in_progress`, `fulfilled`, `rejected`, `cancelled` |
| `raised_at` | timestamptz | Date de réception |
| `fulfilled_at` | timestamptz | Date de traitement |
| `handler_id` | UUID → auth.users | Admin traitant |
| `notes` | text | Notes internes |
| `created_at` | timestamptz | Date de création |
| `updated_at` | timestamptz | Dernière modification |

---

## Relations entre tables

```
users ──< clients        (un thérapeute a plusieurs clients)
users ──< sessions       (un thérapeute a plusieurs séances)
users ──< contacts       (un thérapeute a plusieurs contacts)
users ──1 settings       (un thérapeute a une configuration)
users ──< therapy_cycles (un thérapeute a plusieurs cycles de thérapie)
users ──< invoices       (un thérapeute a plusieurs factures)

clients ──< sessions     (un client a plusieurs séances)
clients ──< contacts     (un client a plusieurs contacts)
clients ──< reports      (un client a plusieurs comptes-rendus)
clients ──< therapy_cycles (un client a plusieurs cycles)
clients ──< invoices     (un client a plusieurs factures)
clients ──? clients      (un client peut parrainer d'autres clients via referred_by)

sessions ──< reports     (une séance peut avoir un compte-rendu)
sessions ──1 invoice_sessions ── invoices (une séance facturée est liée à une facture)
```

---

## Sécurité (RLS) & Performance

### Row Level Security (RLS)
Toutes les tables ont **Row Level Security activé**. 
- **Optimisation de performance** : Les politiques RLS utilisent massivement `(SELECT auth.uid())` au lieu de l'appel direct `auth.uid()`, permettant à PostgreSQL de mettre en cache le résultat et d'accélérer drastiquement les requêtes de lecture.
- **Isolation** : Chaque enregistrement est filtré par `user_id` lié à l'UID de l'utilisateur authentifié.

### Indexation SQL
Pour garantir une réactivité maximale en production, les index suivants sont en place :
- **Clés étrangères** : `user_id`, `client_id`, `referred_by` sont tous indexés dans leurs tables respectives.
- **Recherche** : Index GIN ou B-Tree sur les colonnes de recherche fréquente.
- **Soft Delete** : Index partiel sur `deleted_at IS NULL` pour optimiser l'affichage des listes actives.

---

## Adaptation App ↔ Base de données

L'application React utilise du **camelCase** (ex: `partnerA`, `coupleId`), tandis que la base PostgreSQL utilise du **snake_case** (ex: `partner_a`, `client_id`).

La conversion est gérée automatiquement par les fonctions `adaptClient` / `unadaptClient` (et équivalents pour sessions, reports, professionals) dans `src/context/DataContext.jsx`.

| App (camelCase) | DB (snake_case) |
|-----------------|-----------------|
| `partnerA` | `partner_a` |
| `clientId` | `client_id` |
| `startDate` | `start_date` |
| `paymentMethod` | `payment_method` |
| `hasReport` | `has_report` |
| `clientLinks` | `client_links` |
| `duration` | `duration` |
| ... | ... |
