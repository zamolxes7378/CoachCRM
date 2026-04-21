<!-- TODO: legal review needed -->
<!-- Déclaration d'accessibilité RGAA — squelette provisoire. À compléter après l'audit d'accessibilité complet (Track I et Phase 1). -->

# Déclaration d'accessibilité

*Établie le [TODO: date]. Mise à jour : [TODO: date]*

**Kotech** s'engage à rendre son service **CoachCRM** accessible conformément à l'article 47 de la loi n° 2005-102 du 11 février 2005.

Cette déclaration d'accessibilité s'applique à **CoachCRM** ([https://coachcrm.kotech.ai](https://coachcrm.kotech.ai) — [TODO: confirmer l'URL de production]).

## État de conformité

CoachCRM est en **conformité partielle** avec le référentiel général d'amélioration de l'accessibilité (RGAA) version 4.1, en raison des non-conformités et des dérogations énumérées ci-dessous.

Un audit d'accessibilité est en cours (Phase 0 — Track I). Cette déclaration sera mise à jour à l'issue de cet audit.

## Résultats des tests

[TODO: compléter après audit complet — taux de conformité global, nombre de critères testés / conformes / non conformes]

## Non-conformités connues (état actuel — pre-audit Track I)

- Certains boutons icône ne disposent pas d'un label textuel accessible (`aria-label`)
- Certains champs de formulaire ne sont pas associés à leur libellé via `htmlFor`/`id`
- Les fenêtres modales ne gèrent pas le focus de manière conforme (pas de piège à focus, pas de fermeture par Échap systématique)
- Certains éléments de navigation (liens de pied de page) sont implémentés comme des pseudos-liens sans destination réelle
- Le contraste de certains éléments textuels secondaires est insuffisant

Ces non-conformités sont en cours de correction dans le cadre du Track I du plan de remédiation.

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
