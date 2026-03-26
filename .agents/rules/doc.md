---
trigger: always_on
glob:
description: Règles d'or de l'application — documentation, architecture, code, charte graphique
---

# Règles de documentation

## Documentation systématique des règles métiers
Toute modification demandée par l'utilisateur qui implique une règle métier, une validation, un comportement UI, ou une contrainte fonctionnelle **DOIT** être documentée dans `docs/MES_REGLES_METIER.md` avant ou en même temps que le commit.

### Ce qui doit être documenté :
- Règles de transition d'état (prospect → client, etc.)
- Validation de champs obligatoires
- Comportements conditionnels de l'UI (affichage/masquage, alerte, badge)
- Règles de parrainage et liens entre clients
- Règles de paiement et facturation
- Toute contrainte technique ayant un impact métier

### Format :
- Utiliser les sections existantes de `docs/MES_REGLES_METIER.md` ou en créer de nouvelles
- Chaque règle doit être claire, concise, et testable

### Règle absolue :
**Ne jamais committer un changement de comportement métier sans avoir mis à jour `docs/MES_REGLES_METIER.md`.**

---

# Règles d'Or de l'Application

## 1. Protocole d'action (OBLIGATOIRE)
Avant toute modification de code ou de base de données, tu **DOIS** :
1. **Lire** `/docs/MON_ARCHITECTURE_DONNEES.md` pour connaître le schéma actuel
2. **Analyser l'impact** : vérifier si la demande modifie une relation, un champ, ou une table existante
3. **Valider la cohérence** : vérifier que le changement ne casse pas les règles métier documentées dans `/docs/MES_REGLES_METIER.md`
4. **Proposer un plan** : présenter les modifications prévues en texte clair **AVANT** de générer le code

## 2. Architecture des données & cohérence
- **Source de vérité** : `/docs/MON_ARCHITECTURE_DONNEES.md` fait foi. Interdiction de créer des champs ou tables non documentés — tout ajout doit d'abord être reflété dans ce fichier.
- **Intégrité référentielle** : chaque entité (Client, Session, Facture) doit avoir un ID unique (UUID) et des clés étrangères explicites.
- **Typage strict** : utiliser un typage approprié pour les données sensibles (ex: montants en `numeric`, pas en `float`).

## 3. Règles métier (logique CRM)
- **Confidentialité** : ne jamais exposer les données de santé sans vérifier les permissions d'accès (RLS `user_id`).
- **Relations** : une `Session` appartient obligatoirement à un `Client`. Une facture est liée à une ou plusieurs `Sessions`.
- **Transitions de statut** : les changements de statut (ex: `scheduled` → `completed`) doivent suivre les flux définis dans `/docs/WORKFLOWS.md`.

## 4. Standards de code
- **Modularité** : séparer strictement la logique de données (Services/Context) de l'interface (Components/Pages).
- **Anti-régression** : si tu touches à une fonction existante, vérifie que tous les appels à cette fonction dans le projet sont mis à jour.
- **Commentaires** : documenter les fonctions complexes en expliquant le **pourquoi**, pas juste le **comment**.

## 5. Conformité à la charte graphique
- **Interdiction de styles ad-hoc** : ne jamais utiliser de valeurs de couleurs, de marges, ou de polices arbitraires dans le CSS.
- **Référence unique** : toutes les décisions visuelles doivent être dictées par `/docs/MA_CHARTE_GRAPHIQUE.md`.
- **Utilisation des variables globales** : prioriser systématiquement les CSS variables du projet (ex: `var(--primary-500)`, `var(--space-md)`, `var(--radius-md)`).
- **Réutilisation des composants** : avant de créer un nouvel élément UI, vérifier dans `src/components/` si un composant similaire existe déjà.
- **Ambiance thérapeute** : chaque modification d'UI doit respecter l'univers visuel apaisé, sobre et lisible défini dans la charte.
- **Mise à jour systématique** : toute modification graphique de l'interface (nouveau composant visuel, changement de style, ajout d'état visuel, nouveau pattern UI) **DOIT** être reflétée dans `/docs/MA_CHARTE_GRAPHIQUE.md` avant ou en même temps que le commit.

### Règle absolue :
**Ne jamais committer un changement visuel ou graphique de l'interface sans avoir mis à jour `/docs/MA_CHARTE_GRAPHIQUE.md`.**
