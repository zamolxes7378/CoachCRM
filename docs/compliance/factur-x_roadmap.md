# Factur-X / e-Invoicing — Feuille de route

**Deadline réception :** 2026-09-01 (obligation réception Factur-X pour les grandes entreprises)
**Deadline émission :** 2027-09-01 (obligation émission pour les PME)

## Décision actuelle (2026-04-21)
Les "factures" CoachCRM sont renommées "rappels de paiement" jusqu'à implémentation conforme.
Aucun document émis par CoachCRM ne prétend avoir valeur de facture légale.

## Comparatif PDP (Plateforme de Dématérialisation Partenaire)

| Fournisseur | Prix / mois | Factur-X | API REST | Notes |
|-------------|-------------|----------|----------|-------|
| Pennylane | ~30€ | ✅ | ✅ | Intégration comptable incluse |
| Docaposte | Sur devis | ✅ | ✅ | HDS certifié |
| Chorus Pro | Gratuit | ✅ | ✅ | Secteur public uniquement |
| Yooz | ~50€ | ✅ | ✅ | Focus PME |

**Recommandation :** Pennylane pour MVP (bon compromis coût/intégration). Docaposte si certification HDS requise.

## Action requise
- [ ] Réunion de décision PDP avant 2026-06-01
- [ ] Prototype intégration API Pennylane avant 2026-07-01
- [ ] Recette Factur-X en réception avant 2026-09-01
