# Politique de conservation des données — CoachCRM

> **Document canonique.** Mis à jour conjointement avec `supabase/migrations/20260422101000_retention_policies.sql`.
> Lien depuis la page `/confidentialite` de l'application.

---

## Principes généraux (RGPD Art. 5(1)(e))

CoachCRM applique le principe de **limitation de la conservation** : les données personnelles sont conservées sous une forme permettant l'identification des personnes concernées pendant une durée n'excédant pas celle nécessaire au regard des finalités pour lesquelles elles sont traitées.

---

## Matrice de conservation — 12 catégories

| # | Catégorie | Table(s) | Régime | Durée | Base légale |
|---|-----------|----------|--------|-------|-------------|
| 1 | **Dossier client actif** | `clients` | Suivi en cours | Durée du suivi | RGPD Art. 6(1)(b) — exécution du contrat |
| 2 | **Dossier client post-thérapie** | `clients` | Post-thérapie | 5 ans après clôture | RGPD Art. 17 + recommandation CNIL santé |
| 3 | **Séances** | `sessions` | Post-thérapie | 5 ans après clôture | RGPD Art. 6(1)(b) |
| 4 | **Comptes-rendus (IA)** | `reports` | Post-thérapie | 5 ans après clôture | RGPD Art. 6(1)(b) |
| 5 | **Contacts (appels, emails, SMS)** | `contacts` | Général | 3 ans | RGPD Art. 6(1)(f) — intérêt légitime |
| 6 | **Factures / rappels de paiement** | `invoices` / `billing_reminders` | Comptabilité | 7 ans | Code général des impôts Art. 54 |
| 7 | **Journal d'audit** | `audit_log` | Sécurité | 12 mois | RGPD Art. 32 |
| 8 | **Demandes DSAR** | `dsar_requests` | Conformité | 3 ans | RGPD Art. 12(1) — preuve de traitement |
| 9 | **Enregistrements audio** | `audio_recordings` | Santé (sensible) | Durée de la séance + 30 jours | RGPD Art. 9 + consentement explicite |
| 10 | **Données d'effacement (DSAR)** | tous | Effacement | Immédiat (anonymisation) | RGPD Art. 17 |
| 11 | **Données de portabilité** | tous | Portabilité | Export unique à la demande | RGPD Art. 20 |
| 12 | **Paramètres thérapeute** | `settings` | Configuration | Durée du compte | RGPD Art. 6(1)(b) |

---

## Mécanisme de purge automatique

Un **job mensuel** (`purge_expired_data()`, planifié via `pg_cron`) vérifie la colonne `retention_until` sur chaque table et **anonymise** les enregistrements dont la date limite est dépassée :

- Les données d'identification (nom, email, téléphone) sont remplacées par `ANONYMISÉ`.
- Les métadonnées non-personnelles (dates, montants agrégés) sont conservées à des fins statistiques.
- Les factures ne sont jamais effacées avant 7 ans (obligation légale).

Un mode **simulation** (`SELECT * FROM purge_expired_data(dry_run => true)`) permet de vérifier le nombre de lignes concernées sans effectuer de modifications.

---

## Droits des personnes concernées (DSAR)

Toute personne peut exercer ses droits en contactant le responsable de traitement :

| Droit | Action | Délai de traitement |
|-------|--------|---------------------|
| Accès (Art. 15) | Export JSON de toutes les données | 30 jours maximum |
| Effacement (Art. 17) | Anonymisation immédiate des données identifiantes | 30 jours maximum |
| Portabilité (Art. 20) | Export JSON structuré | 30 jours maximum |
| Rectification (Art. 16) | Correction manuelle par l'administrateur | 30 jours maximum |
| Limitation (Art. 18) | Gel du traitement (flag sur le dossier) | 30 jours maximum |

Les demandes sont tracées dans la table `dsar_requests` et conservées 3 ans.

---

## Colonnes de cycle de vie

Chaque table principale dispose des colonnes suivantes (ajoutées par `20260422101100_retention_columns.sql`) :

| Colonne | Type | Signification |
|---------|------|---------------|
| `deleted_at` | `timestamptz` | Suppression logique (soft delete) — null = enregistrement actif |
| `anonymized_at` | `timestamptz` | Date d'anonymisation par le job de purge |
| `retention_until` | `timestamptz` | Échéance absolue de conservation |

---

## Notes sur les données sensibles

- Les données de santé (notes cliniques, comptes-rendus de séance) sont des **données sensibles** au sens du RGPD Art. 9 et nécessitent une base légale renforcée (consentement explicite ou exercice de la médecine).
- Le principe de **minimisation** (Art. 5(1)(c)) s'applique : seules les informations strictement nécessaires au suivi thérapeutique doivent être saisies.
- Les thérapeutes sont informés de ce principe via des **indicateurs visuels** dans l'interface (composant `DataMinimisationHint`).

---

*Dernière mise à jour : 22 avril 2026 — Track P1-R (Retention · DSAR · data-minimisation)*
