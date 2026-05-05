<!-- Déclaration d'accessibilité RGAA — mise à jour après Phase 1 Track V (2026-04-22) -->

# Déclaration d'accessibilité

*Établie le 2026-04-22. Mise à jour : 2026-04-22.*

**Kotech** s'engage à rendre son service **CoachCRM** accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005.

Cette déclaration d'accessibilité s'applique à **CoachCRM** ([https://coachcrm.kotech.ai](https://coachcrm.kotech.ai)).

## État de conformité

CoachCRM est en **conformité partielle** avec le référentiel général d'amélioration de l'accessibilité (RGAA) version 4.1.

Suite aux corrections apportées lors des Phases 0 (Track I) et 1 (Track V) du plan de remédiation, les non-conformités critiques suivantes ont été corrigées :
- Piège à focus et fermeture par Échap dans toutes les modales (`ConfirmContext`, `SessionDetailModal`)
- Navigation au clavier complète sur le formulaire de connexion et la sidebar
- Tous les boutons icône disposent d'un `aria-label`
- Les régions live (`aria-live`) annoncent les toasts et les indicateurs de chargement
- Les tableaux de données disposent de `<caption>`, `scope="col"` et `scope="row"`
- Les groupes de cases à cocher sont encadrés par `<fieldset><legend>`
- Les tokens de contraste (`--text-secondary`, `--text-tertiary`, `--success`, `--warning`, `--info`) respectent le ratio WCAG AA (4.5:1) sur fond blanc
- La règle `@media (prefers-reduced-motion)` désactive les animations pour les utilisateurs sensibles
- Le titre de chaque page (`document.title`) reflète la section en cours
- L'indicateur de navigation par étapes (onboarding) utilise `<nav aria-label="Étapes">` avec `aria-current="step"`

## Résultats des tests

Taux de conformité estimé après Track V : **≥ 80 %** des critères RGAA 4.1 de niveau A et AA testés sur les 10 pages représentatives.

## Non-conformités résiduelles connues

- Les pages publiques (mentions légales, politique de confidentialité) n'ont pas encore fait l'objet d'un audit complet
- Certains composants tiers (Supabase Auth UI, éditeur de QR code) peuvent présenter des lacunes d'accessibilité hors de notre contrôle direct
- L'accessibilité en mode sombre n'a pas encore été testée

Ces points seront adressés dans la Phase 2 du plan de remédiation.

## Technologies utilisées

- HTML5
- CSS3
- JavaScript (React 19)

## Environnement de test

Les vérifications ont été effectuées avec :
- [TODO: préciser les navigateurs et lecteurs d'écran utilisés pour l'audit]

## Voies de recours

Si vous rencontrez un obstacle à l'accès à un contenu ou à une fonctionnalité, et que vous ne parvenez pas à obtenir une réponse satisfaisante, vous pouvez :

1. **Contacter notre référent accessibilité :** [TODO: e-mail ou formulaire]

2. **Saisir le Défenseur des droits :**
   - Via le formulaire en ligne : [https://formulaire.defenseurdesdroits.fr](https://formulaire.defenseurdesdroits.fr)
   - Par courrier : Le Défenseur des droits, Libre réponse 71120, 75342 Paris CEDEX 07
   - Par téléphone : 09 69 39 00 00 (du lundi au vendredi de 8h00 à 20h00)

3. **Contacter le délégué du Défenseur des droits** dans votre région ([https://www.defenseurdesdroits.fr/office/les-delegues](https://www.defenseurdesdroits.fr/office/les-delegues))
