<!-- TODO: legal review needed -->
<!-- Ce contenu est un squelette provisoire conforme aux Arts. 13-14 RGPD. Il doit être révisé et complété par un juriste avant la mise en production. -->

# Politique de confidentialité

*Dernière mise à jour : [TODO: date]*

## 1. Identité du responsable du traitement

**Responsable :** Kotech  
**Adresse :** [TODO: adresse]  
**Contact :** [TODO: e-mail DPO ou responsable]

## 2. Délégué à la Protection des Données (DPO)

[TODO: indiquer si un DPO a été désigné, ses coordonnées, ou préciser qu'aucun DPO n'est obligatoire pour l'instant et indiquer le contact RGPD de l'entreprise]

## 3. Données collectées et finalités

| Catégorie de données | Finalité | Base légale (RGPD) |
|---|---|---|
| Nom, prénom, adresse e-mail du thérapeute | Création et gestion du compte | Art. 6(1)(b) — exécution du contrat |
| Photo de profil Google | Personnalisation de l'interface | Art. 6(1)(b) — exécution du contrat |
| Données relatives aux patients (nom, coordonnées, séances, notes cliniques) | Gestion de la patientèle par le thérapeute | Art. 6(1)(b) + Art. 9(2)(a) — consentement explicite du patient |
| Données de facturation | Émission et suivi des factures | Art. 6(1)(b) — exécution du contrat |
| Logs de connexion | Sécurité et prévention des abus | Art. 6(1)(f) — intérêt légitime |

## 4. Destinataires des données

Les données sont traitées par les sous-traitants suivants, liés par des clauses contractuelles types (CCT) approuvées par la Commission européenne :

- **Supabase** — stockage de la base de données (région eu-west-2, Londres)
- **Vercel** — hébergement de l'interface web
- **Google** — authentification OAuth (seul l'identifiant Google et la photo de profil sont transmis)

Aucune donnée n'est vendue ni partagée à des fins commerciales.

## 5. Durée de conservation

| Données | Durée |
|---|---|
| Données du compte thérapeute | Durée du contrat + 3 ans (prescription commerciale) |
| Données patients | [TODO: préciser — recommandation CNIL pour données de santé : durée légale de conservation des dossiers médicaux] |
| Logs de connexion | 12 mois |

## 6. Droits des personnes concernées

Conformément au RGPD (Arts. 15 à 22), vous disposez des droits suivants :

- **Droit d'accès** — obtenir une copie de vos données
- **Droit de rectification** — corriger vos données inexactes
- **Droit à l'effacement** — demander la suppression de vos données
- **Droit à la portabilité** — recevoir vos données dans un format structuré
- **Droit d'opposition** — vous opposer à certains traitements fondés sur l'intérêt légitime
- **Droit à la limitation** — suspendre temporairement un traitement

Pour exercer ces droits : [TODO: e-mail ou formulaire dédié]

Vous disposez également du droit d'introduire une réclamation auprès de la **CNIL** : [https://www.cnil.fr/fr/plaintes](https://www.cnil.fr/fr/plaintes)

## 7. Transferts hors UE

Supabase stocke les données en **région eu-west-2 (Londres)**. Le Royaume-Uni bénéficie d'une décision d'adéquation de la Commission européenne. Vercel utilise des serveurs Edge en UE pour l'interface.  
[TODO: vérifier et mettre à jour si d'autres transferts existent]

## 8. Sécurité

Les données sont protégées par chiffrement en transit (TLS 1.2+) et au repos. L'accès à la base de données est contrôlé par des politiques Row Level Security (RLS) Supabase. [TODO: compléter avec les mesures techniques effectives après les Tracks C et D]
