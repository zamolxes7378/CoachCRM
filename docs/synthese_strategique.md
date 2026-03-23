# 🎯 CoachCRM — Synthèse Stratégique & Cahier des Charges
## SaaS Multi-Thérapeutes · CRM Augmenté par l'IA pour la Thérapie de Couple

> **Date** : 19 mars 2026
> **Nature du projet** : Plateforme SaaS multi-tenant
> **Fondatrice** : Thérapeute de couple CNV · 5 ans d'expérience · Libéral
> **Premier use case** : 20 couples actuels → **objectif 100 couples en 2 ans** (x5)
> **Cible MVP** : 5 thérapeutes testeurs

---

## 🧭 Positionnement Stratégique

### Double positionnement

```
┌──────────────────────────────────────────────────────────────────────┐
│                     CoachCRM = DOUBLE BUSINESS                       │
│                                                                      │
│  📦 BUSINESS 1 — Plateforme SaaS (B2B)                              │
│  ├── Cible : thérapeutes de couple en libéral                       │
│  ├── Modèle : Gratuit → Freemium (abonnement mensuel / annuel)     │
│  ├── Valeur : Mémoire clinique augmentée + Analyse IA               │
│  └── MVP : 5 thérapeutes testeurs                                   │
│                                                                      │
│  📚 BUSINESS 2 — Formation en ligne (B2C, propre à la fondatrice)   │
│  ├── Cible : couples en thérapie / grand public                     │
│  ├── Modèle : Lead magnet gratuit → modules payants                 │
│  ├── Valeur : Méthodologie CNV formalisée automatiquement            │
│  └── Alimenté par le pipeline de capitalisation de la plateforme    │
└──────────────────────────────────────────────────────────────────────┘
```

### La promesse

> Une plateforme SaaS qui permet à chaque thérapeute de couple de **transformer ses séances enregistrées en mémoire clinique structurée**, d'obtenir des **comptes rendus automatiques**, et de **capitaliser sur sa méthodologie** — le tout aussi simplement qu'un Google Sheets.

---

## 🏛️ Architecture SaaS

### Multi-tenancy & Authentification

```
┌─────────────────────────────────────────────────────┐
│                   CoachCRM SaaS                      │
│                                                      │
│  🔐 Auth Google OAuth 2.0 (Gmail)                   │
│       │                                              │
│       ├── 👤 Thérapeute A (tenant isolé)            │
│       │    ├── 👫 Ses couples                       │
│       │    ├── 🎙️ Ses enregistrements              │
│       │    ├── 📋 Ses CR                            │
│       │    └── 📚 Ses fiches méthodologiques        │
│       │                                              │
│       ├── 👤 Thérapeute B (tenant isolé)            │
│       │    ├── 👫 Ses couples                       │
│       │    ├── 🎙️ Ses enregistrements              │
│       │    ├── 📋 Ses CR                            │
│       │    └── 📚 Ses fiches méthodologiques        │
│       │                                              │
│       └── 👑 Admin (fondatrice)                     │
│            ├── 📊 Dashboard admin                   │
│            ├── 👥 Gestion des thérapeutes           │
│            ├── 📈 Métriques d'usage                 │
│            └── 🔧 Configuration plateforme          │
└─────────────────────────────────────────────────────┘
```

### Principes clés

| Principe | Détail |
|----------|--------|
| **Isolation des données** | Un thérapeute ne voit JAMAIS les données d'un autre |
| **Auth simplifiée** | Connexion via Gmail (Google OAuth) — pas de mot de passe à gérer |
| **UX "Google Sheets"** | Interface ultra-simple, prise en main immédiate, niveau digital 3/5 |
| **Mobile-first pour l'usage terrain** | Smartphone (alertes, enregistrement), PC (CR, méthodologie) |
| **Hors-ligne** | Non requis |

### Modèle économique de la plateforme

| Phase | Modèle | Détail |
|-------|--------|--------|
| **MVP** | 🆓 Gratuit | 5 thérapeutes testeurs — validation du concept |
| **Post-validation** | 💎 Freemium | Fonctionnalités de base gratuites, IA & avancé = payant |
| **Scaling** | 💰 Abonnement mensuel + annuel | Grille tarifaire à définir |

---

## 📊 Priorisation des Axes

| Priorité | Axe | Justification | Urgence |
|----------|-----|---------------|---------|
| **#1** | 🧠 Mémoire clinique augmentée | Besoin immédiat (seuil de 20 couples atteint), killer feature = CR avec analyse synthétique | 🔴 Immédiat |
| **#2** | 📚 Capitalisation méthodologique | Critère de succès à 1 an = fiches méthodologiques en ligne. Directement alimenté par l'Axe 1 | 🟠 Court terme |
| **#3** | 🔍 Analyse augmentée | Valeur forte mais uniquement à la demande. Déjà utilisatrice d'IA | 🟡 Moyen terme |
| **#4** | 🗂️ CRM classique | Besoins minimaux (Excel + Calendly + Brevo suffisent pour l'instant) | 🟢 Fond |

---

## 🏗️ Architecture Fonctionnelle

### Axe 1 — 🧠 Mémoire Clinique Augmentée

#### Pipeline Audio → Intelligence

```
📱 Voice Memo          🔄 Upload           📝 Transcription       🤖 CR Auto
(iPhone, 1-2h)  ───→  dans l'app   ───→   (diarisation)    ───→  (double format)
                                                                       │
                                     ┌─────────────────────────────────┤
                                     ▼                                 ▼
                              📋 Briefing                    📚 Extraction
                              pré-séance                     pédagogique
                           (notif 30 min avant)            (→ Axe 3)
```

#### Fonctionnalités détaillées

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| **Upload audio** | Import depuis Voice Memo / enregistrement in-app | MVP |
| **Transcription automatique** | Speech-to-text, diarisation légère (qui parle) | MVP |
| **CR double format** | Résumé narratif + bullet points structurés | MVP |
| **Extraction structurée** | Thèmes, émotions/partenaire, patterns, exercices, progrès, vigilance | MVP |
| **Extraction pédagogique** | Isoler les explications méthodologiques du thérapeute | MVP |
| **Briefing pré-séance** | Notification push 30 min avant avec résumé actionnable | MVP |
| **Historique consultable** | Tous les CR d'un couple en timeline | MVP |

#### Contenu du Compte Rendu Automatique

```
═══════════════════════════════════════════════════════
  COMPTE RENDU DE SÉANCE — Couple Dupont · S#12
  Date : 15 mars 2026 · Durée : 1h23 · Phase : Analyse
═══════════════════════════════════════════════════════

📝 RÉSUMÉ NARRATIF
  [Paragraphe de synthèse de la séance]

📋 POINTS CLÉS
  • Thèmes abordés : Communication, gestion de la colère
  • Émotions — Partenaire A : frustration, besoin de reconnaissance
  • Émotions — Partenaire B : retrait, peur du conflit
  • Pattern identifié : évitement-poursuite (récurrent S#8, S#10, S#12)
  • Progrès : Première verbalisation du besoin de sécurité par B

⚠️ POINTS DE VIGILANCE
  • [Risques ou signaux d'alerte]

📌 EXERCICES PRESCRITS
  • [Liste des exercices / devoirs maison]

🎓 CONTENU PÉDAGOGIQUE DÉLIVRÉ
  • [Explications méthodologiques du thérapeute — pour Axe 3]
═══════════════════════════════════════════════════════
```

---

### Axe 2 — 🔍 Analyse Augmentée

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| **IA contextuelle par dossier** | Chat avec l'IA qui connaît tout l'historique du couple | V2 |
| **Contre-propositions** | L'IA challenge les hypothèses thérapeutiques | V2 |
| **Suggestions d'exercices** | Propositions créatives et adaptées au contexte | V2 |
| **Détection de patterns transversaux** | Analytics cross-dossiers (ex. « 70% de vos couples présentent… ») | V2 |
| **Références théoriques** | Liens avec Gottman, EFT, CNV, systémique… | V3 |

> ⚠️ **Principe UX fondamental** : Toutes les fonctionnalités IA sont **à la demande uniquement** — jamais de suggestions non sollicitées.

---

### Axe 3 — 📚 Capitalisation Méthodologique

#### Pipeline de capitalisation

```
🎙️ Séance enregistrée
    │
    ▼
🤖 Extraction pédagogique (Axe 1)
    │ "Le thérapeute explique la valeur des émotions..."
    ▼
📝 Agrégation par thématique
    │ Regroupe les explications similaires de N séances
    ▼
📋 Fiche méthodologique structurée
    │
    ├──→ 🔒 Contenu payant (formation en ligne)
    └──→ 🆓 Lead magnet (acquisition)
```

#### Structure d'une fiche méthodologique

| Section | Description |
|---------|-------------|
| **Problématique** | Le problème relationnel adressé |
| **Signes cliniques** | Comment identifier cette problématique chez un couple |
| **Cadre théorique** | Fondements CNV / théoriques |
| **Interventions recommandées** | Approches du thérapeute |
| **Exercices pratiques** | Activités pour le couple (devoirs maison) |
| **Erreurs à éviter** | Pièges courants |
| **Indicateurs de progrès** | Comment mesurer l'avancement |

#### Modèle économique de la formation (propre à la fondatrice)

| Phase | Modèle | Contenu |
|-------|--------|---------|
| **Acquisition** | Gratuit (lead magnet) | Contenus d'introduction, quiz relationnel |
| **Phase 1** | Achat unique par module | Fiches méthodologiques approfondies |
| **Phase 2** | Abonnement (quand catalogue suffisant) | Accès à tous les modules + nouveautés |

---

### CRM — 🗂️ Gestion Client

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| **Fiche couple** | Données contact + synthèse thérapie + maturité émotionnelle | MVP |
| **Dashboard couple** | Indicateurs de maturité émotionnelle + évolution + historique événements clés | MVP |
| **Timeline** | Chronologie visuelle des séances, crises, progrès | MVP |
| **Tags par phase** | Début / Analyse / Intégration | MVP |
| **Devoirs maison** | Suivi des exercices prescrits et exécutés | MVP |
| **Séances individuelles** | Gestion Couple + Partenaire A + Partenaire B | MVP |
| **Alertes** | Couple inactif, exercice non réalisé | V2 |
| **Bilan de clôture** | Rapport pour le couple + demande de recommandation | V2 |
| **Intégrations** | Google Agenda, Calendly, Brevo | V2 |

---

### Admin — 👑 Back-Office Administrateur

| Fonctionnalité | Description | Priorité |
|----------------|-------------|----------|
| **Dashboard admin** | Vue globale de l'activité de la plateforme | MVP |
| **Gestion des thérapeutes** | Liste, activation, désactivation des comptes | MVP |
| **Métriques d'usage** | Nombre de séances transcrites, CR générés, thérapeutes actifs | MVP |
| **Gestion des plans** | Configuration freemium / premium par thérapeute | V2 |
| **Facturation plateforme** | Gestion des abonnements mensuels / annuels | V2 |

---

## 📱 UX & Environnement

| Aspect | Spécification |
|--------|--------------|
| **Philosophie UX** | 🎯 **"Aussi simple qu'un Google Sheets"** — prise en main immédiate |
| **Device principal** | 📱 Smartphone (alertes, enregistrement) + 💻 PC (CR, méthodologie) |
| **Hors-ligne** | Non requis |
| **Niveau digital cible** | 3/5 — interface épurée, pas de surcharge visuelle |
| **Scénario cauchemar** | ❌ Informations trop denses et mal organisées |
| **Intégrations** | Google Agenda, Calendly, Brevo |

---

## 🚀 Roadmap Suggérée

### MVP (Mois 1-3) — « Ma mémoire augmentée » · 5 testeurs

**Plateforme :**
- Authentification Google OAuth 2.0 (connexion via Gmail)
- Architecture multi-tenant (isolation des données par thérapeute)
- Back-office admin (dashboard, gestion des thérapeutes, métriques)
- Interface responsive (mobile + desktop)

**Fonctionnel :**
- Upload audio + transcription automatique
- CR automatique double format (narratif + structuré)
- Extraction pédagogique dans les CR
- Fiches couples avec dashboard synthétique
- Timeline des séances
- Tags par phase (Début / Analyse / Intégration)
- Briefing pré-séance (notification 30 min avant)
- Suivi des devoirs maison

### V2 (Mois 4-6) — « Mon analyste augmenté » · Freemium

**Plateforme :**
- Modèle freemium (gratuit + abonnement mensuel / annuel)
- Gestion des plans et facturation
- Intégrations (Google Agenda, Calendly, Brevo)

**Fonctionnel :**
- IA conversationnelle contextuelle par dossier
- Contre-propositions et suggestions d'exercices
- Détection de patterns transversaux
- Système d'alertes
- Bilan de clôture automatisé (avec demande de recommandation)

### V3 (Mois 7-12) — « Ma machine à capitaliser » · Scaling

**Fonctionnel :**
- Agrégation automatique des contenus pédagogiques par thématique
- Génération de fiches méthodologiques structurées
- Export/publication (format formation en ligne)
- Tunnel lead magnet → contenu payant
- Analytics de pratique (métriques transversales)
- Identification des meilleures interventions

---

## ⚠️ Chantiers Complémentaires Identifiés

| Chantier | Description | Urgence |
|----------|-------------|---------|
| **Cadre juridique RGPD** | Consentement patient pour l'enregistrement, stockage données de santé, hébergement HDS | 🔴 Avant le MVP |
| **Consentement éclairé** | Template de consentement pour l'enregistrement des séances | ✅ Fait |
| **Cadre éthique IA** | Garde-fous pour l'analyse IA de dossiers patients | 🟠 Avant la V2 |
| **Propriété intellectuelle** | Protéger la méthodologie dans les formations en ligne | 🟡 Avant la V3 |
| **CGU / CGV de la plateforme** | Conditions d'utilisation SaaS pour les thérapeutes | 🔴 Avant le MVP |
| **Politique de confidentialité** | RGPD vis-à-vis des thérapeutes utilisateurs | 🔴 Avant le MVP |

---

## 📏 Critères de Succès

| Horizon | Critère |
|---------|---------|
| **3 mois** | 5 thérapeutes testeurs utilisent activement la plateforme, CR fonctionnels |
| **6 mois** | Mémoire clinique fiable, premiers retours utilisateurs positifs |
| **1 an** | Capacité à mettre en ligne des fiches méthodologiques en un minimum de temps, lancement freemium |
| **3 ans** | Volume de patients en forte croissance, formation en ligne prend le relais méthodologique, séances plus courtes focalisées sur l'intégration |
