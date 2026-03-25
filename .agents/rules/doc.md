---
trigger: always_on
glob:
description: Règles de documentation obligatoires
---

# Règles de documentation

## Documentation systématique des règles métiers
Toute modification demandée par l'utilisateur qui implique une règle métier, une validation, un comportement UI, ou une contrainte fonctionnelle **DOIT** être documentée dans `docs/mes regles.md` avant ou en même temps que le commit.

### Ce qui doit être documenté :
- Règles de transition d'état (prospect → client, etc.)
- Validation de champs obligatoires
- Comportements conditionnels de l'UI (affichage/masquage, alerte, badge)
- Règles de parrainage et liens entre clients
- Règles de paiement et facturation
- Toute contrainte technique ayant un impact métier

### Format :
- Utiliser les sections existantes de `docs/mes regles.md` ou en créer de nouvelles
- Chaque règle doit être claire, concise, et testable

### Règle absolue :
**Ne jamais committer un changement de comportement métier sans avoir mis à jour `docs/mes regles.md`.**
