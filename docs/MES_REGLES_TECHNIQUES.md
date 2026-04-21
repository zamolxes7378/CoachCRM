Ce document définit les standards d'ingénierie obligatoires pour garantir la robustesse, la performance et la maintenabilité de l'application.

## 0. Règle d'Or — Amélioration Continue (Critique)

> [!IMPORTANT]
> **Documentation Systématique des Correctifs** :
> Chaque solution identifiée pour résoudre un bug ou un crash (ex: erreur `.split()`, données corrompues) **DOIT** être immédiatement documentée dans les sections appropriées de ce document (`Robustesse`, `Adaptateurs`). 
> L'objectif est de transformer chaque incident en un standard technique preventif pour enrichir la "mémoire immunitaire" de l'application.

## 1. Intégrité et Refactoring (Règle Critique)

> [!IMPORTANT]
> **Protection du Scope et des Références** :
> Avant de modifier une fonction calculatrice ou un service (ex: `monthlyStats`, `adapters`) :
> 1. **Inventaire** : Lister les clés de l'objet retourné.
> 2. **Audit de dépendance** : Vérifier où ces clés sont consommées dans l'UI.
> 3. **Validation post-edit** : S'assurer que chaque variable reste définie. En JS, privilégier des valeurs par défaut (`|| 0`, `|| []`) pour éviter les crashs de rendu.

> [!CAUTION]
> **Anti-pattern : Variable définie dans un `useMemo` utilisée en dehors** :
> Les variables définies à l'intérieur d'un callback `useMemo` sont **scopées** à ce callback et **inaccessibles** en dehors. Toute référence externe provoque un `ReferenceError` fatal (page blanche).
> - *Mauvais* : Définir `initialRate` dans `useMemo(() => { const initialRate = ... })` puis l'utiliser 1000 lignes plus loin dans le JSX.
> - *Bon* : Extraire la variable au niveau du composant, ou utiliser une propriété de l'objet retourné par le `useMemo`.
> - **Audit obligatoire** : Après toute refactorisation impliquant des `useMemo`, rechercher globalement (`grep`) chaque variable locale du callback pour vérifier qu'elle n'est pas référencée ailleurs dans le même fichier.

## 2. Architecture et Flux de Données

- **Séparation des responsabilités** : 
    - Le calcul métier lourd doit être encapsulé dans des `useMemo` ou des fonctions pures à l'extérieur du composant.
    - Les composants de vue ne doivent pas gérer de logique complexe de filtrage ou de calcul de CA.
- **Immuabilité** : Ne JAMAIS muter l'état directement. Utiliser systématiquement le pattern de spread `[...prev]` ou `{...prev}`.
- **Adapteurs de données** : Toute donnée provenant de Supabase doit passer par un adapteur (`adapters.js`) pour garantir le mapping `snake_case` → `camelCase` dès l'entrée dans le système.

## 3. Performance et Optimisation

- **Rendus React** : Utiliser `useMemo` pour les calculs coûteux basés sur de larges tableaux (ex: `sessions`, `clients`).
- **Dépendances de Hooks** : Toujours remplir scrupuleusement les tableaux de dépendances. Ne pas inclure d'objets ou de tableaux créés à la volée (utiliser `useMemo` ou `useCallback`).
- **Graphes et Listes** : Limiter le nombre de points de données traités simultanément. Utiliser des agrégations au niveau service si possible.

## 4. Robustesse (Anti-Crash)

- **Optional Chaining** : Utiliser `?.` systématiquement sur les objets dont l'existence dépend d'un chargement asynchrone (ex: `client?.partnerA?.firstName`).
- **Optional Chaining dans les `useState` initialiseurs** : Les initialiseurs de `useState` s'exécutent **avant** les guards (`if (!client) return ...`). Un accès comme `useState(client.sessionRate)` crashe si `client` est `undefined`. Toujours utiliser `client?.sessionRate` dans les initialiseurs.
    - *Mauvais* : `const [rate, setRate] = useState(activeCycle.rate || client.sessionRate)`
    - *Bon* : `const [rate, setRate] = useState(activeCycle?.rate || client?.sessionRate || defaultRate)`
- **Null guards et Robustesse de Rendu** : Ne jamais appeler une méthode native (`.split`, `.map`, `.filter`) sur une variable sans garantir son type ou utiliser l'optional chaining.
    - *Mauvais* : `client.aiSynthesis.text.split('\n')`
    - *Bon* : `client.aiSynthesis?.text?.split('\n') || []`
- **Null Guards** : Toujours prévoir un état de repli (fallback) pour les affichages numériques (ex: `{amount?.toFixed(2) || '0.00'}€`).
- **Garantie de Persistance (Write-First)** :
    - **Attente Systématique** : Tout appel asynchrone modifiant des données (Create/Update/Delete) **DOIT** être précédé de `await` avant de fermer une modale ou de rediriger l'utilisateur.
    - **Blocage sur Erreur** : Si la base de données renvoie une erreur, l'interface **DOIT rester ouverte** ou afficher une alerte bloquante. Il est interdit de masquer l'interface si l'enregistrement a échoué.
    - **Indicateur visuel** : Utiliser un état `isSaving` pour désactiver les boutons d'action pendant la transaction.
- **Gestion d'erreurs** : Les appels asynchrones (`async/await`) doivent être protégés par des blocs `try/catch` avec un feedback utilisateur.

## 5. Nomenclature et Lisibilité

- **Clarté sur l'Intention** : Nommer les fonctions par leur action (`calculateMonthlyMetrics`, `validateClientStatus`).
- **Early Returns** : Favoriser les retours anticipés (`if (!data) return null;`) pour éviter l'imbrication excessive de blocs `if`.
- **Commentaires "Pourquoi"** : Documenter le rationnel derrière les hacks ou les contournements de limitations techniques, pas le "comment" qui doit être explicite par le code.
## 6. Manipulation de Dates et Tris

- **Standard de Tri** : Pour trier des chaînes de caractères (strings) représentant des dates ISO-8601, privilégier **`localeCompare`** plutôt que la conversion en objet `Date`.
    - *Ascendant* : `(a, b) => (a.date || '').localeCompare(b.date || '')`
    - *Descendant* : `(b, b) => (b.date || '').localeCompare(a.date || '')`
- **Garantie sur le tri par défaut** : Sauf mention contraire, les données financières doivent être présentées en ordre **ascendant** (du 1er au 31 du mois).

## 7. Memoization Durable (Hooks)

- **Dépendances de Scope** : Les `useMemo` qui traitent des collections de données (ex: `sessions`) doivent **impérativement** inclure la collection source dans leur tableau de dépendances.
- **Rafraîchissement** : Si un état de rafraîchissement manuel existe (ex: `refreshKey`), il doit être inclus pour forcer le recalcul lors du passage de l'utilisateur d'une page à l'autre ou après une reconnexion.
- **Sécurité** : Toujours filtrer les données `null` ou `undefined` avant d'appliquer un tri ou un `map` sur une collection.
- **Règle d'or sur l'ordre des Hooks** : Pour éviter les crashes de type *« Rendered more hooks than during the previous render »*, il est **strictement interdit** de placer un retour anticipé (`if (!data) return ...`) avant la déclaration de TOUS les hooks du composant (`useState`, `useEffect`, `useMemo`). La structure doit toujours être : 
    1. Déclaration de tous les hooks.
    2. Tests de garde et retours anticipés si données manquantes.
- **Variables calculées orphelines (Dead Code visuel)** : Toute variable calculée dans un `useMemo` ou une boucle de rendu (ex: `prevH`, `prevCA`) **DOIT** être connectée à un élément JSX de sortie. Une variable calculée qui n'est jamais affichée constitue un bug silencieux (fonctionnalité fantôme). Lors d'un ajout de comparaison ou d'indicateur, vérifier systématiquement que la donnée calculée est **rendue** dans le DOM.
 
## 8. Rendu UI et Fonctions Utilitaires (Anti-Crash)
 
- **Primitives d'abord** : Les fonctions utilitaires globales (ex: `getClientName`, `formatDate`, `getClientSource`) doivent **toujours** retourner des types primitifs (string, number, boolean) ou une valeur par défaut (`'—'`). 
- **Séparation Rendu/Logique** : Il est interdit de retourner du JSX depuis une fonction de type "data helper". Le rendu visuel complexe (icônes, couleurs, badges) doit être géré au niveau du composant React ou via une fonction de rendu dédiée à l'affichage (ex: `renderCell(value)`).
- **Standard d'absence** : Pour les données manquantes dans les tableaux, utiliser la chaîne `'—'` par défaut. L'UI se chargera de la transformer visuellement en `<AbsenceDash />` (icône centrée) si nécessaire.
- **Interdiction des Constante Métier (Anti-pattern)** : Il est strictement interdit d'utiliser des constantes numériques codées en dur pour des valeurs métier (ex: `DEFAULT_RATE = 75`) au sein des pages ou composants. Toute valeur de repli (fallback) doit provenir d'une fonction de calcul dynamique respectant la hiérarchie des réglages (Tarif spécifique > Tarif Global > Fallback final centralisé).
- **Pureté des Helpers Financiers** : Les fonctions de calcul de tarifs ou de stats (ex: `getDefaultRate`) définies hors composants doivent être **pures** et accepter l'intégralité des sources de données nécessaires en arguments (`clients`, `sessionRates`, etc.) pour garantir leur testabilité et leur réutilisabilité sans dépendance au scope du composant.
- **Robustesse de Mapping (Clé/Libellé)** : Pour les champs à choix multiples (ex: `source`, `phase`), la fonction de recherche doit être **insensible à la casse** et vérifier à la fois la **clé technique** interne (`key`) et le **libellé propre** (`label`). Cela évite d'afficher des données brutes stockées historiquement (ex: `parrainage`, `referral`) au lieu de la donnée formatée (**Parrainage**).
## 9. Normalisation des Données (Prénoms) : Il est **obligatoire** de normaliser les prénoms (FirstNames) via la fonction `capitalizeWords` dans les adaptateurs. Chaque mot (séparé par un espace ou un tiret) doit commencer par une majuscule. Cela garantit une UI propre et professionnelle quelles que soient les saisies utilisateur.
    - *Exemple* : `"jean-baptiste"` → `"Jean-Baptiste"`.
- **Robustesse des Données JSON (Adaptateurs)**

- **Initialisation des Listes** : Tout champ censé contenir un tableau (ex: `themes`, `patterns`) doit être initialisé à `[]` dans l'adaptateur pour éviter des erreurs `.map` dans l'UI.
    - *Exemple* : `themes: r.themes || []`
- **Sécurisation des types String/JSON** : Pour les colonnes de type `text` contenant potentiellement du JSON (ex: `ai_synthesis`), il est **obligatoire** de sécuriser le parsing. 
    - *Adaptateur lecture* : `aiSynthesis: typeof c.ai_synthesis === 'string' ? JSON.parse(c.ai_synthesis) : c.ai_synthesis` (avec garde si le string n'est pas un JSON valide).
    - *Adaptateur écriture* : `ai_synthesis: typeof data.aiSynthesis === 'object' ? JSON.stringify(data.aiSynthesis) : data.aiSynthesis`.
    - *Pourquoi* : Évite les crashes fatals (page blanche) si une donnée malformée ou brute arrive dans un `JSON.parse` systématique.

## 10. Standards de Sécurité et RLS

- **Filtres row-level** : Ne jamais omettre la clause `user_id` dans les requêtes manuelles si la RLS n'est pas activée par défaut sur la table.
- **Validation write-check** : Vérifier l'existence et l'appartenance de l'objet (`id` + `user_id`) avant toute opération de suppression (Delete).

## 11. Composants Partagés Obligatoires (Anti-Duplication)

> [!IMPORTANT]
> **Règle d'unicité des composants visuels** :
> Toute logique de rendu visuel récurrente (couleurs, icônes, SVG) doit être encapsulée dans un composant partagé unique. Il est **strictement interdit** de dupliquer des tokens de couleur, des SVG inline, ou des logiques de lookup de style dans les pages consommatrices.

### Composants à usage obligatoire

| Composant | Fichier | Usage | Exports |
|-----------|---------|-------|---------|
| **ClientTypeBadge** | `src/components/ClientTypeBadge.jsx` | Pastille d'identité client (type + couleurs) | `ClientTypeBadge` (default), `ClientTypeIcon`, `CLIENT_TYPE_STYLES` |
| **SessionCard** | `src/components/session/SessionCard.jsx` | Carte de séance (agenda, timeline, dashboard) | default export |
| **NewClientButton** | `src/components/NewClientButton.jsx` | Bouton « Nouveau client » doré | default export |
| **AddSessionButton** | `src/components/AddSessionButton.jsx` | Bouton « Ajouter une séance » bleu | default export |
| **ViewSwitcher** | `src/components/layout/ViewSwitcher.jsx` | Sélecteur de vue (Liste/Calendrier/Cartes) | default export |
| **ReferrerSection** | `src/components/client/ReferrerSection.jsx` | Section parrain (création + édition) | default export |
| **ReportIcon** | `src/components/ReportIcon.jsx` | Icône canonique CR (FileText bleu `#2B6CB0`) | default export |
| **PaymentBadge** | `src/components/PaymentBadge.jsx` | Badge mode de paiement (Chèque/Virement/Espèces) — rouge si non encaissé, vert si encaissé | default export, `PAYMENT_LABELS` |

### Règle d'ajout
Lorsqu'un même pattern de rendu (couleur + icône + structure) apparaît dans **3 fichiers ou plus**, il doit être extrait dans un composant partagé dans `src/components/` et documenté dans cette section.

## 12. Fallbacks Obligatoires sur les Props de Composants Partagés

> [!CAUTION]
> **Tout composant partagé utilisé dans plusieurs pages DOIT prévoir des fallbacks** pour chaque prop optionnelle pouvant être `undefined` ou `null`. L'absence de fallback sur une prop destructurée (ex: `phaseColor.bg` quand `phaseColor` est `undefined`) provoque un crash fatal silencieux (page blanche).

### Règle concrète
- *Mauvais* : `background: phaseColor.bg` (crash si `phaseColor` est undefined)
- *Bon* : `const pc = phaseColor || { bg: 'var(--primary-50)', color: 'var(--primary-700)' }`

### Checklist de sécurité (SessionCard)
Les props suivantes de `SessionCard` doivent **toujours** avoir un fallback interne :
- `phaseColor` → fallback `{ bg: 'var(--primary-50)', color: 'var(--primary-700)' }`
- `PhaseIcon` → garde `{PhaseIcon && <PhaseIcon />}` avant le rendu
- `clientType` → fallback `null` (utilise le mode phase par défaut)
- `formatDate` / `formatTime` → ne jamais appeler sans vérification d'existence

## 13. Registre des Icônes SVG Custom (Anti-Divergence)

> [!IMPORTANT]
> **Les icônes SVG custom ne provenant pas de Lucide doivent être documentées** dans `MA_CHARTE_GRAPHIQUE.md` avec leur chemin SVG exact, leurs couleurs de référence, et la liste des fichiers où elles sont utilisées. Il est **interdit** de créer une variante d'une icône custom sans mettre à jour le registre.

### Registre actuel

| Icône | Description | Couleur de référence | Fichiers |
|-------|-------------|---------------------|----------|
| **Facture (document + €)** | SVG document avec symbole euro | `#1A365D` (bleu profond) | `DashboardPage.jsx`, `FinancesPage.jsx`, `ClientFinancialPanel.jsx` |
| **FamilyIcon** | SVG famille (3 cercles + 2 chemins) | `currentColor` | `ClientTypeBadge.jsx` |

### Règle d'harmonisation
Lors de l'ajout d'une icône dans une nouvelle vue, vérifier qu'elle utilise la **couleur de référence exacte** documentée. En cas de divergence entre vues (ex: `#2B6CB0` vs `#1A365D`), le registre fait foi.

## 14. Statut Temporel des Séances (Règle Critique)

> [!CAUTION]
> **Interdiction d'utiliser `s.status === 'scheduled'` seul pour l'affichage** :
> Le champ `status` en base de données n'est **pas mis à jour automatiquement** lors du passage de l'heure de la séance. Il est **strictement interdit** d'afficher le statut d'une séance en se basant uniquement sur `s.status`. Il faut impérativement utiliser les flags calculés par `DataContext` :
> - `s.isCompleted` : la date+durée de la séance est passée
> - `s.isToConfirm` : séance passée, `status === 'scheduled'`, sans moyen de paiement, montant effectif ≠ 0 (inclut `null` = tarif non configuré)
> - `s.isConfirmed` : séance passée avec conditions de complétion remplies
> - `s.status` : valeur enrichie par DataContext (déjà corrigée en `'completed'` si `isConfirmed`)

### Règle d'affichage du statut (4 états)

| Condition | Label | Couleur |
|-----------|-------|---------|
| `status === 'cancelled'` | Annulée | `var(--error)` |
| `isToConfirm` | À confirmer | `#D97706` (ambre) |
| `status === 'scheduled'` (futur) | Planifiée | `var(--text-tertiary)` |
| `status === 'completed'` | Réalisée | `var(--success)` |

### Contextes concernés
Cette règle s'applique à **tous** les endroits affichant le statut d'une séance :
- `FinancesPage.jsx` : tableau mensuel détaillé (colonne Statut) et export CSV
- Tout futur composant, tableau ou export affichant le statut d'une séance

### Anti-redondance : `ConfirmBadge` vs texte "À confirmer"

> [!WARNING]
> **Il est interdit d'afficher simultanément** le texte "À confirmer" ET le composant `ConfirmBadge` sur la même ligne d'une séance. Cela crée une redondance visuelle ("À confirmer" + "CONFIRMER").

**Règle d'usage :**

| Contexte | Indicateur à utiliser |
|----------|----------------------|
| **Colonne Statut** de tableau (`FinancesPage`) | Texte "À confirmer" (badge ambre) |
| **Export CSV** | Texte "À confirmer" |
| **Vue compacte par séance** (`ClientFinancialPanel` suivi financier) | `ConfirmBadge` seul (pas de texte status) |
| **Carte de séance** (`SessionCard`) | `ConfirmBadge` seul |

Dans les vues compactes où `ConfirmBadge` est présent, les sessions `isToConfirm` doivent être traitées comme des sessions complétées pour l'affichage du label (juste `S{num} · {date}`) — le badge gère le statut visuel.

### Synchronisation `ConfirmBadge` (Règle Critique)

> [!CAUTION]
> **Le `ConfirmBadge` doit apparaître même si `status === 'completed'` en DB** :
> Le système auto-confirme certaines séances en base lors du chargement (`loadData`). Si la séance n'a pas de `paymentMethod`, le badge doit toujours s'afficher. La condition dans `SessionCard.jsx` est :
> ```
> needsConfirm = isPast && !isCancelled && !isOffered && (!isConfirmed || !session.paymentMethod)
> ```
> Le `|| !session.paymentMethod` est critique pour rattraper les cas où `isConfirmed === true` à cause du status DB.

## 15. Authentification et Déconnexion

> [!IMPORTANT]
> **Configuration Supabase Auth** :
> Le client Supabase utilise `storageKey: 'coachcrm-auth-token'` dans `src/lib/supabase.js`. Toute modification de cette clé doit être reflétée dans la fonction `handleLogout` de `App.jsx`.

- **Déconnexion (handleLogout)** — Séquence obligatoire pour éviter les race conditions :
    1. **Reset immédiat de l'état React** : `setUser(null)` avant tout appel asynchrone.
    2. **Nettoyage localStorage** : Supprimer `coachcrm-auth-token` et `coachcrm_onboarding_done` **avant** `signOut`.
    3. **Scope `global`** : Utiliser `supabase.auth.signOut({ scope: 'global' })` pour révoquer aussi la session côté serveur Supabase (pas seulement locale).
    4. **Bloc `finally`** : Le `window.location.href = '/'` doit être dans un `finally` pour garantir le rechargement même en cas d'erreur réseau.

> [!CAUTION]
> **Anti-pattern : `signOut({ scope: 'local' })` + redirect immédiat** :
> Ne jamais utiliser `scope: 'local'` seul pour la déconnexion. La session serveur reste active et peut se re-synchroniser au rechargement de la page, annulant la déconnexion.

## 16. Modularisation et Découpage des Pages Complexes

> [!IMPORTANT]
> **Règle de Modularité (Pattern Orchestrateur)** :
> Toute page dépassant ~800 lignes ou cumulant plusieurs responsabilités métier (ex: Dashboard, Fiche Client) doit être scindée en un "Composant Orchestrateur" et plusieurs "Panneaux" (`Panels`).

### Règles d'extraction
1. **Couplage d'états** : Si un groupe d'états (`useState`, `useRef`) ne sert qu'à une zone spécifique de la page (ex: édition de tarif, de notes), il doit être encapsulé dans le sous-composant correspondant (`ClientStatsPanel`, `ClientNotesPreview`).
2. **Passage de props** : L'orchestrateur passe les fonctions globales (`updateClient`, `formatDate`) et la donnée centrale aux panneaux. Les panneaux gèrent leurs interactions locales de manière autonome.
3. **Hiérarchie visuelle** : Les panneaux extraits (`ClientHeaderPanel`, `ClientTimelinePanel`, etc.) doivent être rangés dans des sous-dossiers pertinents (ex: `src/components/client/`).
4. **Maintenance** : Ce découpage réduit la complexité cyclomatique, prévient les re-rendus excessifs de toute la page, et rend le composant racine purement déclaratif. L'orchestrateur devient un routeur visuel.
