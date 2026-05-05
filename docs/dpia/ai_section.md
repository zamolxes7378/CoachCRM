# Section IA — Analyse d'impact (DPIA)

**Référence :** DPIA CoachCRM — Section Traitement IA

## Traitement concerné
Génération assistée de comptes-rendus de séance par modèle de langage.

## Base légale
Art. 6(1)(f) RGPD — intérêt légitime (amélioration de la productivité du thérapeute).
Art. 9(2)(h) RGPD — traitement de données de santé à des fins de soins de santé.

## Mesures techniques
- Contenu IA étiqueté dans l'interface (EU AI Act Art. 50).
- Validation humaine obligatoire avant export (`reviewed_at` non null).
- Métadonnées du modèle stockées (`ai_metadata` JSONB).
- Aucune donnée patient transmise au modèle sans pseudonymisation.

## Risques résiduels
Faible — supervision humaine systématique.
