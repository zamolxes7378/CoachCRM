# Carte du système IA — CoachCRM

**Version :** 1.0 — 2026-04-21
**Statut :** Brouillon — en attente de validation juridique

## 1. Identification du système
- **Nom :** Module de rédaction assistée CoachCRM
- **Finalité :** Aide à la rédaction de comptes-rendus de séance pour thérapeutes de couple.
- **Classification EU AI Act :** Article 50 (obligation de transparence) — pas haut risque (Art. 6).

## 2. Fonctionnement
Le module génère des suggestions de comptes-rendus à partir des notes de séance du thérapeute. Aucune décision automatique sur les patients n'est prise.

## 3. Supervision humaine (Art. 50)
- Tout contenu généré est marqué "Généré par IA".
- Le thérapeute doit valider explicitement avant export ou partage.
- La validation est horodatée et stockée (`reports.reviewed_at`).

## 4. Données d'entraînement
Le module utilise un modèle tiers (à préciser lors du déploiement). Aucune donnée patient n'est utilisée pour l'entraînement sans consentement explicite.

## 5. Biais et risques
- Risque de suggestions inexactes ou culturellement inadaptées.
- Atténuation : supervision obligatoire du thérapeute.

## 6. Contact DPO
dpo@kotech.ai

---
*Document à réviser par le conseil juridique avant déploiement du module IA.*
