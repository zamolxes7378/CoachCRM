# Interview Métier : Gestion des Frais d'Annulation

Suite à l'implémentation technique des frais d'annulation, une étude d'impact "Senior Architect" a identifié plusieurs points de décision nécessaires pour garantir la cohérence du CRM.

## 1. Analyse d'Impact Technique

Actuellement, l'implémentation est la suivante :
- **Données** : La séance est marquée `cancelled` avec un `paymentAmount` (ex: 75€).
- **Finances** : Le Chiffre d'Affaire (CA) ne comptabilise que les séances `completed`. **Impact** : Vos revenus réels sont sous-estimés dans le dashboard.
- **Alliance Thérapeutique** : Une annulation payée valide actuellement le passage du prospect en client. **Impact** : Cela peut fausser votre tunnel de conversion si vous n'avez jamais rencontré le client.
- **Progression** : Les séances annulées ne sont pas comptées dans le numéro de séance (S1, S2...).

---

## 2. Questions pour l'Utilisateur (Interview)

### Question A : Comptabilisation du Chiffre d'Affaire
Souhaitez-vous que les indemnités d'annulation soient intégrées dans votre CA global ou suivies séparément ?
> [!NOTE]
> Recommandation : Les intégrer au CA pour refléter votre revenu réel, mais avec une étiquette "Annulation facturée".

### Question B : Conversion Prospect → Client
Une annulation payée doit-elle "valider l'alliance" et transformer un prospect en client ?
- **Option 1** : Oui, car il y a eu une transaction financière et un engagement.
- **Option 2** : Non, attendre la première séance réellement effectuée.

### Question C : Progression de la thérapie
Si une séance prévue comme la "S4" est annulée mais payée :
- **Option 1** : La séance suivante reste la "S4" (on ne compte que le travail effectif).
- **Option 2** : Elle consomme le numéro, et la suivante devient "S5" (car elle a été facturée).

### Question D : Facturation et Libellé
Quel libellé préférez-vous voir apparaître sur la facture pour ces frais ?
- "Séance annulée (indemnité)"
- "Annulation facturée"
- Autre : [Votre précision ici]

---

## 3. Prochaine étapes

Une fois vos réponses validées, je procéderai à :
1. La mise à jour des formules de calcul du CA.
2. L'ajustement du service d'alliance thérapeutique.
3. La documentation finale dans `MES_REGLES_METIER.md`.
