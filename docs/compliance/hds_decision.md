# Décision formelle — Statut HDS (Hébergement de Données de Santé)

> **Document de référence.** Cette décision formelle est requise avant le lancement de la piste P1-Z (chiffrement Vault) et constitue la prémisse de la RoPA (`ropa.md`) et du dossier de preuves (`evidence_pack.md`).

---

## Décision

| Champ | Valeur |
|-------|--------|
| **Date de décision** | 2026-04-22 |
| **Décision** | Persona **non réglementée** — la certification HDS n'est **pas obligatoire** dans l'état actuel du produit |
| **Signataire** | _________________________ (direction Kotech, à compléter) |
| **Révision suivante** | 2027-04-22 ou à tout changement réglementaire ou d'offre produit |

---

## 1. Périmètre des personas concernées

CoachCRM cible exclusivement les praticiens **non réglementés au sens du Code de la santé publique** :

- Coachs de couple pratiquant la CNV (Communication Non-Violente)
- Thérapeutes de couple sans titre professionnel protégé
- Praticiens du développement personnel **sans numéro ADELI ni RPPS**

Sont **explicitement exclus** du périmètre actuel :
- Psychologues (titre protégé, Loi du 25 juillet 1985)
- Psychothérapeutes enregistrés (Loi 2004-806 Art. 91)
- Médecins, psychiatres, infirmiers et tout professionnel inscrit aux registres ADELI / RPPS

---

## 2. Cadre juridique applicable

### 2.1 Article L.1111-8 du Code de la santé publique (CSP)

L'article L.1111-8 CSP impose la certification HDS à « toute personne qui héberge des données de santé à caractère personnel recueillies à l'occasion d'activités de **prévention, de diagnostic, de soins ou de suivi social et médico-social**, pour le compte de personnes physiques ou morales à l'origine de la production ou du recueil desdites données ».

Trois conditions **cumulatives** doivent être réunies pour que l'obligation s'applique :

1. Les données sont des données de santé à caractère personnel ;
2. Elles sont hébergées pour le compte d'un tiers ;
3. Ce tiers est une personne physique ou morale **soumise au secret professionnel** au sens de l'article 226-13 du Code pénal dans le cadre de l'exercice d'une **profession de santé réglementée**.

### 2.2 Analyse — persona non réglementée

La **condition 3 n'est pas remplie** pour les coachs et thérapeutes CNV non réglementés : ils n'exercent pas une profession de santé visée par le CSP et ne figurent pas dans les registres ADELI / RPPS. En conséquence, l'obligation HDS au sens de l'article L.1111-8 CSP **ne leur est pas applicable**.

Les données traitées (notes cliniques, comptes-rendus de séance, indicateurs de maturité émotionnelle) **restent des données sensibles au sens de l'article 9 du RGPD** et sont traitées comme telles. L'absence d'obligation HDS n'exonère pas CoachCRM des obligations RGPD renforcées sur les données de catégorie spéciale.

### 2.3 Références légales et réglementaires

- Article L.1111-8 CSP (hébergement de données de santé)
- Décret n° 2018-137 du 26 février 2018 relatif à l'hébergement de données de santé
- Article 226-13 Code pénal (secret professionnel)
- RGPD Article 9 (données sensibles / catégories particulières)
- CNIL délibération 2018-327 (liste des traitements soumis à AIPD obligatoire)
- CNIL guidance « assistants numériques santé » (recommande HDS comme bonne pratique même hors obligation stricte)

---

## 3. Mesures techniques substituant à la certification HDS

En l'absence d'obligation HDS, les mesures suivantes constituent les garanties retenues pour la protection des données de santé Art. 9 :

| Mesure | Détail | Piste / Commit |
|--------|--------|----------------|
| **Hébergement EU (Supabase)** | Projet Supabase hébergé en région EU (eu-west-2 / Londres — à confirmer si migration vers eu-central-1 Frankfurt réalisée). Supabase est certifié SOC 2 Type II et ISO 27001. | Infrastructure |
| **Chiffrement au repos** | Chiffrement des disques Supabase par défaut (AES-256 via AWS). Chiffrement au niveau colonne via Supabase Vault sur les colonnes Art. 9 (`reports.narrative`, `clients.notes`, `clients.ai_synthesis`, `sessions.summary`, `sessions.audio_file`) — **planifié P1-Z** | P1-Z (planifié) |
| **Journal d'accès aux données sensibles** | Table `access_log` pour les lectures sur données Art. 9 — **planifié P1-Z** | P1-Z (planifié) |
| **RLS + MFA admin** | Supabase RLS sur toutes les tables principales ; TOTP MFA obligatoire pour les administrateurs ; verrouillage de domaine Google Workspace | P1-O — commit `f5ed705` |
| **Conservation et effacement** | Politiques de rétention automatisées (`purge_expired_data()`), table `dsar_requests`, anonymisation sur demande | P1-R — commit `7199562` |
| **AIPD (DPIA)** | La DPIA est requise (CNIL 2018-327) et en cours d'élaboration (`docs/dpia/`) | P1-Y (en cours) |

---

## 4. Gate de souscription — obligation d'ingénierie

> **TODO engineering — référence P2 :** La page d'inscription DOIT comporter une question explicite :
>
> *« Êtes-vous un professionnel de santé réglementé disposant d'un numéro ADELI ou RPPS ? »*
>
> - Si **oui** : le flux d'inscription doit être **bloqué** avec un message indiquant que CoachCRM n'est pas encore homologué pour les professionnels de santé réglementés, et proposer une inscription sur liste d'attente en vue d'un partenariat HDS futur.
> - Si **non** : le flux continue normalement.
>
> Cette mesure protège CoachCRM contre une inscription non contrôlée d'un professionnel réglementé (psychologue, psychiatre, médecin) qui déclencherait l'obligation HDS dès la première création de dossier patient. Ce gate est une **condition préalable à tout lancement commercial public**.
>
> Référence de conception : `audit/06_french_regulations.md` §R-07 ; `audit/05_gdpr_privacy.md` §Art. 35 — Actionable note.

---

## 5. Roadmap vers un chemin HDS

Si CoachCRM souhaite à terme accueillir des professionnels réglementés (psychologues, psychothérapeutes, psychiatres), les étapes suivantes sont requises :

1. Migrer l'hébergement vers un HDS-certifié (ex. OVHcloud Healthcare, Clever Cloud HDS, Scaleway Healthcare, Outscale).
2. Obtenir ou sous-traiter la gestion des obligations HDS (audit annuel, Politique de Sécurité des Systèmes d'Information de Santé — PSSISS).
3. Mettre à jour les CGU, la politique de confidentialité et les DPA en conséquence.
4. Réaliser une DPIA mise à jour couvrant le nouveau périmètre.
5. Supprimer le gate ADELI/RPPS ou le remplacer par un routage vers l'offre HDS.

---

## 6. Cadence de révision

Ce document est révisé :
- **Annuellement**, au plus tard le 22 avril de chaque année ;
- **Immédiatement** en cas de changement de la cible commerciale (ouverture aux professionnels réglementés) ;
- **Immédiatement** en cas d'évolution législative ou réglementaire (révision L.1111-8 CSP, nouvelles guidelines CNIL, etc.).

---

*Document rédigé le 2026-04-22 — Piste P1-Y. Ferme la finding R-07 (statut HDS ambigu, décision non documentée).*
*Croiser avec : [`docs/compliance/ropa.md`](ropa.md) · [`docs/compliance/evidence_pack.md`](evidence_pack.md) · [`docs/dpia/ai_section.md`](../dpia/ai_section.md)*
