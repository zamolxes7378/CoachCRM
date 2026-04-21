# Écart contenu facture — L441-9 / 242 nonies A CGI

**Analyse au :** 2026-04-21

## Schéma actuel (billing_reminders, ex-invoices)

Source : `supabase/migrations/20260401000000_baseline_schema.sql` + vérification live DB 2026-04-21.

Table `billing_reminders` (ex `invoices`) : `id UUID`, `user_id`, `client_id`, `invoice_date DATE`, `sent BOOLEAN`, `sent_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ`.

Table `billing_reminder_sessions` (ex `invoice_sessions`) : `billing_reminder_id UUID`, `session_id UUID`.

Commentaire baseline confirmé : *"Confirmed at the DB level that this table has no invoice_number, no amount, no TVA fields, no status."*

## Champs obligatoires manquants

| Champ légal | Texte de loi | Présent dans CoachCRM | Fichier:table |
|-------------|--------------|----------------------|---------------|
| Numéro de facture séquentiel | L441-9 1° | ❌ (id UUID non séquentiel) | billing_reminders.id |
| Date d'émission | L441-9 2° | ✅ (invoice_date / created_at) | billing_reminders.invoice_date |
| Identité vendeur (SIRET, raison sociale, adresse) | L441-9 3° | ❌ | — |
| Identité acheteur (nom, adresse) | L441-9 4° | ❌ (client_id seul — nom client sans adresse ni SIRET) | billing_reminders.client_id |
| Désignation prestation | L441-9 5° | ⚠️ (partiel — séances liées via billing_reminder_sessions, sans intitulé ni code CPV) | billing_reminder_sessions |
| Quantité | L441-9 6° | ⚠️ (déductible du nombre de session_id liés, non stocké explicitement) | billing_reminder_sessions |
| Prix unitaire HT | L441-9 7° | ❌ (aucun champ amount / price dans billing_reminders) | — |
| Taux de TVA applicable | L441-9 8° | ❌ | — |
| Montant TVA | L441-9 9° | ❌ | — |
| Montant TTC | L441-9 10° | ❌ | — |
| Conditions de paiement | L441-9 11° | ❌ | — |
| Pénalités de retard | L441-9 12° | ❌ | — |

## Conclusion
10 champs absents, 2 partiels → les documents actuels **ne peuvent pas** être qualifiés de factures légales au sens de L441-9 / 242 nonies A CGI.
Phase 2 (Q3 2026) implémentera ces champs + intégration PDP Factur-X.
