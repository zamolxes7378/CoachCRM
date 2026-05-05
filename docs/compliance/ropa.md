# Registre des activités de traitement (RoPA)

**Responsable de traitement :** Kotech SAS
**Base légale du registre :** RGPD Article 30
**DPO / contact :** à compléter (obligatoire si DPIA déclenchée — CNIL recommande désignation volontaire)
**Dernière révision :** 2026-04-22
**Prochaine révision :** 2027-04-22

> Ce registre est le document canonique recensant les activités de traitement de CoachCRM. Il est tenu à la disposition de la CNIL sur demande (Art. 30(4) RGPD). Les durées de conservation sont alignées sur `docs/retention_policy.md` et la migration `20260422101000_retention_policies.sql`.
>
> Références techniques : [`docs/compliance/evidence_pack.md`](evidence_pack.md) · [`docs/compliance/hds_decision.md`](hds_decision.md)

---

## Mesures de sécurité communes (§Mesures techniques)

Les mesures suivantes s'appliquent à l'ensemble des traitements sauf mention contraire :

- **RLS Supabase** — isolation stricte des données par praticien (chaque thérapeute ne voit que ses propres données)
- **MFA TOTP** obligatoire pour les comptes administrateurs
- **Timeout de session** (30 minutes d'inactivité)
- **Chiffrement en transit** — TLS 1.2+ sur toutes les connexions (Supabase + Vercel CDN)
- **Chiffrement au repos** — AES-256 sur les volumes Supabase (infrastructure AWS)
- **Chiffrement au niveau colonne (Vault)** — *planifié P1-Z* sur les colonnes Art. 9
- **Journal d'audit** (`audit_log`) — toutes les opérations d'écriture et d'export tracées
- **Purge automatique** (`purge_expired_data()`) — job mensuel pg_cron
- **Gestion DSAR** — table `dsar_requests`, interface d'administration, délai 30 jours

---

## Tableau des activités de traitement

| # | Activité de traitement | Finalité | Base légale | Catégories de personnes | Catégories de données | Destinataires | Durée de conservation | Transferts hors UE | Mesures de sécurité |
|---|------------------------|----------|-------------|-------------------------|-----------------------|---------------|----------------------|-------------------|---------------------|
| 1 | **Gestion du compte praticien** | Création et gestion du compte thérapeute ; authentification ; paramétrage de l'application | Art. 6(1)(b) RGPD — exécution du contrat | Praticiens (coachs, thérapeutes non réglementés) | Nom, prénom, email professionnel, mot de passe hashé (Supabase Auth), token MFA, paramètres de l'application (`settings`) | Supabase (sous-traitant), Vercel (livraison SPA) | Durée du compte actif + 3 ans après résiliation (CGU) | Vercel (US) — SCC + DPA ; Supabase (EU) — pas de transfert | §Mesures techniques communes ; MFA obligatoire admin |
| 2 | **Gestion des clients** | Création, suivi, archivage des dossiers clients des thérapeutes | Art. 6(1)(b) RGPD + Art. 9(2)(h) RGPD (soins / suivi thérapeutique, consentement implicite du professionnel) | Clients des praticiens (patients indirects) | Nom, prénom, date de naissance, type de suivi (couple, individuel, famille), notes cliniques, scores de maturité émotionnelle, synthèse IA (`ai_synthesis`), adresse de facturation (`billing_address`), notes dynamiques | Supabase (sous-traitant) | 5 ans après clôture du suivi (soft delete `deleted_at` + `retention_until`) | Supabase (EU) — pas de transfert | §Mesures techniques communes ; **données Art. 9** ; chiffrement Vault colonnes sensibles *planifié P1-Z* |
| 3 | **Gestion des séances** | Planification, suivi des séances, enregistrement des présences, paiements | Art. 6(1)(b) RGPD | Clients des praticiens | Date, durée, statut, tarif, mode de paiement, raison d'annulation (libre texte — peut contenir des données de santé), notes de séance | Supabase (sous-traitant) | 5 ans après clôture du suivi | Supabase (EU) — pas de transfert | §Mesures techniques communes ; `DataMinimisationHint` sur champ libre |
| 4 | **Gestion des comptes-rendus et analyse IA** | Rédaction, stockage et analyse IA des comptes-rendus de séance ; transparence Art. 50 AI Act | Art. 6(1)(b) + Art. 9(2)(h) RGPD ; consentement explicite patient requis (template `docs/template_consentement_patient.md`) | Clients des praticiens | Narratif de séance, indicateurs de vigilance, synthèse IA, métadonnées AI (`ai_metadata` : modèle, confiance, horodatage), enregistrements audio (*planifié P1-Z*) | Supabase (sous-traitant) ; **fournisseur LLM (à confirmer — non choisi à ce jour)** ; fournisseur de transcription audio (à confirmer) | 5 ans après clôture du suivi | **LLM / transcription : à confirmer** — si fournisseur non-UE : SCC + DPA + AIPD requise | §Mesures techniques communes ; **données Art. 9 à haute sensibilité** ; bannière transparence IA dans l'interface ; chiffrement Vault *planifié P1-Z* |
| 5 | **Gestion de la facturation** | Émission et suivi des factures, rappels de paiement, archivage comptable | Art. 6(1)(c) RGPD — obligation légale (Code général des impôts Art. 54) | Clients des praticiens | Nom, prénom, montant, date, numéro de facture, séances couvertes, adresse de facturation | Supabase (sous-traitant) | 7 ans (obligation comptable légale) — les factures ne sont pas effacées avant l'échéance | Supabase (EU) — pas de transfert | §Mesures techniques communes ; les factures sont exclues de la purge automatique avant 7 ans |
| 6 | **Gestion des contacts / réseau professionnel** | Suivi des appels, emails, SMS et interactions avec le réseau professionnel du thérapeute | Art. 6(1)(f) RGPD — intérêt légitime (gestion de la relation professionnelle) | Contacts professionnels du thérapeute | Nom, prénom, coordonnées (email, téléphone), notes libres, type de relation | Supabase (sous-traitant) | 3 ans | Supabase (EU) — pas de transfert | §Mesures techniques communes |
| 7 | **Gestion du parrainage (referrals)** | Suivi des recommandations entre praticiens (clients communs, liens de parrainage) | Art. 6(1)(b) RGPD | Praticiens, clients (liens) | Identifiant praticien référent, identifiant client, type de lien (`client_links` JSONB) | Supabase (sous-traitant) | Durée du compte praticien | Supabase (EU) — pas de transfert | §Mesures techniques communes |
| 8 | **Gestion des exports de dossiers** | Export XLSX de données clients à la demande du thérapeute (portabilité, archivage externe) | Art. 6(1)(b) RGPD + Art. 20 RGPD (portabilité) | Clients des praticiens | Ensemble des données du dossier client exporté | Supabase (sous-traitant) ; **navigateur du thérapeute** (export local) | Export unique, non conservé côté serveur | À confirmer selon localisation du poste du thérapeute | Export tracé dans `audit_log` ; confirmation modale obligatoire ; nom de fichier sans PII |
| 9 | **Traitement des demandes RGPD (DSAR)** | Gestion des droits d'accès, rectification, effacement, portabilité, limitation (Art. 15–20 RGPD) | Art. 6(1)(c) RGPD — obligation légale | Toute personne concernée (clients ou praticiens) | Identité du demandeur, type de droit exercé, date, statut, pièces justificatives | Supabase (sous-traitant) ; administrateur Kotech | 3 ans (preuve de traitement) | Supabase (EU) — pas de transfert | §Mesures techniques communes ; table `dsar_requests` ; interface admin dédiée |
| 10 | **Journalisation d'audit** | Traçabilité des opérations pour la sécurité, la conformité et la lutte contre la fraude | Art. 6(1)(c) + Art. 32 RGPD | Praticiens (titulaires de compte) | Identifiant utilisateur, action, entité, horodatage, adresse IP (à confirmer si capturée) | Supabase (sous-traitant) ; Kotech (admin) | 12 mois | Supabase (EU) — pas de transfert | Accès restreint aux administrateurs ; purge automatique à échéance |
| 11 | **Journalisation d'erreurs (Sentry)** | Surveillance des erreurs applicatives, stabilité de la plateforme | Art. 6(1)(f) RGPD — intérêt légitime (sécurité de l'application) | Praticiens (utilisateurs actifs au moment de l'erreur) | Stack trace, URL, user-agent, identifiant de session Sentry (pseudonymisé) | Sentry Inc. (sous-traitant) | Politique de rétention Sentry (90 jours par défaut sur plan gratuit — **à confirmer**) | Sentry : région **à confirmer** (EU vs. US) — si US : SCC via DPA Sentry | DSN via variable d'environnement `VITE_SENTRY_DSN` ; données pseudonymisées dans la mesure du possible |
| 12 | **Analytics / usage** | Analyse du comportement utilisateur, amélioration du produit | — | — | — | — | — | — | **Néant** — aucun outil d'analytics tiers identifié dans le code source au 2026-04-22 (Vercel Analytics non activé, pas de Google Analytics, pas de Mixpanel) |
| 13 | **Cookies et sessions** | Authentification (JWT Supabase), session OAuth Google, stockage local de session | Art. 6(1)(b) RGPD (cookies strictement nécessaires) ; consentement non requis pour cookies fonctionnels | Praticiens (utilisateurs authentifiés) | Token JWT Supabase (stocké dans `localStorage` sous la clé `coachcrm-auth-token`) ; cookie de session Google OAuth (PKCE flow) | Supabase (sous-traitant) ; Google (OAuth provider — sous-traitant) | Durée de la session + refresh token (rotation à chaque usage) | Google (US) — SCC + DPA Google Workspace | Clé de stockage nommée (`coachcrm-auth-token`) ; PKCE flow ; timeout 30 min |
| 14 | **Communications par email** | Notifications applicatives (invitation, rappel de séance, confirmation DSAR) si implémentées | Art. 6(1)(b) RGPD | Praticiens, clients (si notification directe) | Adresse email, prénom, contenu de la notification | Supabase (emails transactionnels via SMTP interne) | **À confirmer** — fonctionnalité email non identifiée dans le code source au 2026-04-22 | Supabase SMTP (EU) — à confirmer si fournisseur SMTP tiers (SendGrid, Resend…) | À confirmer selon fournisseur SMTP effectif |
| 15 | **Sauvegardes Supabase** | Continuité de service, restauration après incident (PITR — Point-in-Time Recovery) | Art. 6(1)(c) RGPD + Art. 32 RGPD (intégrité et disponibilité) | Toutes les personnes concernées dans la base | Intégralité des données de production (base de données + storage) | Supabase (sous-traitant) — sauvegardes gérées par l'infrastructure Supabase/AWS | PITR : 7 jours (plan Pro Supabase) ; snapshots quotidiens | Supabase (EU) — pas de transfert hors UE pour les sauvegardes EU | Chiffrement AES-256 des backups ; accès restreint à l'infrastructure Supabase ; test de restauration trimestriel recommandé (**à confirmer**) |

---

## Items « à confirmer » (actions requises avant lancement)

| # | Item | Responsable | Priorité |
|---|------|-------------|----------|
| 1 | **Région Supabase** — confirmer eu-west-2 (Londres) ou migration vers eu-central-1 (Frankfurt) / eu-west-3 (Paris) | Engineering | P1 |
| 2 | **Fournisseur LLM / transcription** — choix du fournisseur, DPA, SCC si non-UE, extension AIPD | Leadership + Legal | P1 avant activation audio/AI |
| 3 | **Région Sentry** — confirmer la région du projet Sentry (EU vs. US) ; si US, documenter SCC via DPA Sentry | Engineering | P1 |
| 4 | **Fournisseur SMTP** — confirmer si les emails transactionnels passent par Supabase Auth ou un tiers (Resend, SendGrid…) ; si tiers, signer DPA | Engineering | P1 |
| 5 | **Rétention Sentry** — confirmer la durée de rétention configurée sur le projet Sentry | Engineering | P1 |
| 6 | **DPA Supabase** — signer le DPA Supabase (disponible sur https://supabase.com/legal/dpa) | Legal | P1 (bloquant DPIA) |
| 7 | **DPA Vercel** — signer le DPA Vercel | Legal | P1 |
| 8 | **DPA Google Workspace / OAuth** — signer le DPA Google (disponible sur https://workspace.google.com/intl/en/terms/dpa_terms.html) | Legal | P1 |
| 9 | **Test de restauration Supabase** — procédure PITR documentée et testée trimestriellement | Engineering | P2 |

---

*Ce registre est révisé annuellement et à chaque changement substantiel de traitement. Dernière révision : 2026-04-22. Prochaine révision : 2027-04-22.*

*Références : RGPD Art. 30 · `docs/compliance/evidence_pack.md` · `docs/compliance/hds_decision.md` · `docs/retention_policy.md` · `supabase/migrations/20260422101000_retention_policies.sql`*
