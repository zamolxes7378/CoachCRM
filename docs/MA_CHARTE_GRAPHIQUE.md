# CoachCRM — Design System
## Charte Graphique & Système de Design

> **Date** : 27 mars 2026
> **Basé sur** : Interview préférences graphiques fondatrice + Optimisations Pilotage Intelligent
> **Mots-clés** : Bienveillant · Simple · Créatif · Proactif
> **Iconographie** : Lucide React (pas d'emojis — icônes professionnelles et plus grandes)

---

## Direction Artistique

### Tonalité

| Dimension | Choix |
|-----------|-------|
| **Univers** | Chaleureux-Premium — « Accueillant et élégant » |
| **Personnalité** | Bienveillant, Simple, Créatif |
| **Inspiration** | Notion (organisation), Monday (couleur/énergie), Airbnb (rondeur) |
| **Anti-patterns** | Trop d'informations, couleurs agressives, vert, emojis |

### Principes de design

1. **Chaleur premium** — Bleu marine doux comme ancrage de confiance + touches dorées/chaudes pour la chaleur humaine
2. **Simplicité Notion** — Densité modérée, espaces blancs, hiérarchie claire
3. **Rondeur bienveillante** — Formes arrondies, transitions douces, pas d'angles agressifs
4. **Lisibilité avant tout** — « Aussi simple qu'un Google Sheets » reste le mantra

---

## Palette de Couleurs

### Mode Clair (dominant)

```
COULEURS PRINCIPALES
├── Primary (Bleu Marine Doux)
│   ├── 50:  #F0F4F8   ← Fond de page / surfaces très légères
│   ├── 100: #D9E2EC   ← Bordures, séparateurs
│   ├── 200: #BCCCDC   ← Éléments désactivés
│   ├── 300: #9FB3C8   ← Texte tertiaire
│   ├── 400: #829AB1   ← Icônes secondaires
│   ├── 500: #627D98   ← Texte secondaire
│   ├── 600: #486581   ← Texte principal
│   ├── 700: #334E68   ← Titres, navigation active
│   ├── 800: #243B53   ← En-têtes, sidebar
│   └── 900: #102A43   ← Texte fort, accents
│
├── Accent Chaud (Terracotta / Or)
│   ├── Light:  #FBD38D  ← Badges, highlights doux
│   ├── Main:   #D69E2E  ← Boutons d'action secondaires, accents dorés
│   ├── Dark:   #B7791F  ← Hover sur accents
│   └── Warm:   #C05621  ← Alertes chaleureuses, accents terracotta
│
├── Surfaces
│   ├── Background:   #FAFBFC  ← Fond de page principal
│   ├── Card:         #FFFFFF  ← Cartes, modales
│   ├── Sidebar:      #243B53  ← Sidebar (fond sombre bleu marine)
│   └── Sidebar Text: #D9E2EC  ← Texte dans la sidebar
│
└── Sémantiques
    ├── Success:  #38A169  (vert uniquement pour validation, discret)
    ├── Warning:  #D69E2E  (doré)
    ├── Error:    #C53030  (rouge doux)
    └── Info:     #3182CE  (bleu informatif)
```

### Mode Sombre (option)

```
COULEURS MODE SOMBRE
├── Background:    #1A202C
├── Card:          #2D3748
├── Primary Text:  #E2E8F0
├── Secondary:     #A0AEC0
├── Accent Chaud:  #ECC94B
└── Sidebar:       #171923
```

---

## Typographie

### Police principale

**Plus Jakarta Sans** — moderne, arrondie, professionnelle, excellente lisibilité

```css
/* Importation */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

/* Usage */
font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
```

### Échelle typographique

| Rôle | Taille | Poids | Ligne | Usage |
|------|--------|-------|-------|-------|
| **Display** | 28px | 700 | 1.2 | Titre de page principale |
| **H1** | 24px | 700 | 1.3 | Titres de section |
| **H2** | 20px | 600 | 1.4 | Sous-titres |
| **H3** | 16px | 600 | 1.5 | Titres de cartes |
| **Body** | 14px | 400 | 1.6 | Texte courant |
| **Body Small** | 13px | 400 | 1.5 | Texte secondaire |
| **Caption** | 12px | 500 | 1.4 | Labels, badges, métadonnées |
| **Overline** | 11px | 600 | 1.3 | Catégories, tags (uppercase) |

---

## Espacement & Layout

### Grille d'espacement (base 4px)

| Token | Valeur | Usage |
|-------|--------|-------|
| `xs` | 4px | Padding interne très serré |
| `sm` | 8px | Gap entre éléments proches |
| `md` | 16px | Padding des cartes |
| `lg` | 24px | Marge entre sections |
| `xl` | 32px | Marge entre blocs majeurs |
| `2xl` | 48px | Espacement de page |

### Rayons de bordure (style arrondi)

| Élément | Rayon |
|---------|-------|
| Boutons | 8px |
| Cartes | 12px |
| Modales | 16px |
| Avatars | 50% (cercle) |
| Badges / Tags | 6px |
| Inputs | 8px |

### Sidebar

| Propriété | Valeur |
|-----------|--------|
| Largeur | 260px (desktop), rétractable à 64px (icônes seules) |
| Fond | Bleu marine sombre (`#243B53`) |
| Texte | Clair (`#D9E2EC`) |
| Élément actif | Fond légèrement plus clair + bordure gauche dorée |
| Icônes | Lucide React (cohérent, léger) |

---

## Iconographie

### Bibliothèque : Lucide React

Toutes les icônes utilisent **Lucide React** — un set d'icônes open-source, cohérent, léger et professionnel.

```
npm install lucide-react
```

### Taille des icônes

| Contexte | Taille | Stroke |
|----------|--------|--------|
| **Sidebar** | 22px | 1.75px |
| **En-têtes de section** | 24px | 1.75px |
| **Dans les cartes** | 20px | 1.5px |
| **Boutons** | 18px | 1.5px |
| **Inline (texte)** | 16px | 1.5px |
| **Dashboard stats** | 28px | 1.75px |

### Éléments d'interface récurrents

#### 1. Indicateur d'absence / Donnée vide (Dashboard & Tableaux)
Utilisé lorsqu'une information est manquante ou non applicable pour maintenir la structure sans polluer la lecture.

- **Composant** : `Minus` (Lucide React)
- **Style** : `size={14}`, `strokeWidth={3}`, `color: var(--primary-300)`
- **Centrage** : L'indicateur d'absence doit toujours être **centré horizontalement** par rapport à son conteneur (exemple: cellule de tableau), même si le texte de la colonne est aligné à gauche.
- **Usage** : Colonnes de tableau vides, champs optionnels non renseignés, états futurs.
- **Règle** : Ne jamais utiliser le caractère texte `—` ou `-`. Toujours utiliser l'icône stylisée pour un rendu "Premium".

### Mise en page Dashboard
- **Grille principale** : **Fixe à 65% / 35%** (`grid-template-columns: 65% 35%`). La colonne de gauche (Mon agenda) occupe 65% de la largeur disponible pour garantir la lisibilité de la timeline.
- **Troncature des noms** : Tout affichage de nom de client ou de couple dans une liste (agenda, tableaux) doit utiliser `text-overflow: ellipsis` pour éviter de briser le layout.

### Mapping des icônes

| Concept | Icône Lucide | Nom |
|---------|-------------|-----|
| Accueil | Maison | `Home` |
| Couples | Deux personnes | `Users` |
| Séances / Audio | Micro | `Mic` |
| Comptes Rendus | Document | `FileText` |
| Méthodologie | Livre | `BookOpen` |
| IA Assistant | Cerveau | `Brain` |
| Paramètres | Engrenage | `Settings` |
| Aide | Point d'interrogation | `HelpCircle` |
| Admin | Couronne | `Crown` |
| Agenda | Calendrier | `Calendar` |
| Alertes | Cloche | `Bell` |
| Upload | Télécharger | `Upload` |
| Phase Début | Pousse | `Sprout` |
| Phase Analyse | Loupe | `Search` |
| Phase Intégration | Cible | `Target` |
| Couple actif | Coeur | `Heart` |
| CR / Compte-rendu | Document texte | `ReportIcon` (composant) |
| Exercice | Crayon | `PenTool` |
| Progrès | Tendance haute | `TrendingUp` |
| Vigilance | Triangle alerte | `AlertTriangle` |
| Succès | Coche cercle | `CheckCircle` |
| Erreur | X cercle | `XCircle` |
| Nouveau | Plus | `Plus` |
| Voir plus | Flèche droite | `ArrowRight` |
| Fermer | X | `X` |

### Header de date « Aujourd'hui » (Agenda)

| Token | Valeur normale | Valeur Aujourd'hui |
|-------|---------------|-------------------|
| **Couleur texte** | `var(--primary-400)` | `var(--accent-main)` |
| **Bordure bottom** | `1px solid var(--primary-50)` | `2px solid var(--accent-main)` |
| **Point indicateur** | aucun | Cercle 6px `var(--accent-main)` |
| **Format texte** | `Lundi 30 mars` | `Aujourd'hui – 31 mars` (sans année) |

> **Règle — Affichage de l'année sur les dates de séance :**
> Lorsqu'une séance est éloignée de **plus de 6 mois** de la date du jour (passée ou future), l'année doit être affichée (ex : `Jeudi 28 septembre 2025`). En dessous de 6 mois, l'année est masquée (ex : `Jeudi 28 septembre`).
> Cette règle s'applique **partout** dans l'application via `formatDashboardDate` (agenda) et `formatDate` (fiches client).

### Feedback visuel — champs de recherche

| État | Bordure | Icône | Action |
|------|---------|-------|--------|
| **Vide** | `none` | `var(--primary-300)` | — |
| **Rempli** | `1.5px solid #D97706` | `#D97706` (ambre) | Bouton × ambre pour effacer |

### Icône Compte-rendu — `ReportIcon` (composant canonique)

> [!IMPORTANT]
> **Toute représentation visuelle d'un compte-rendu (CR)** doit utiliser le composant `ReportIcon` (`src/components/ReportIcon.jsx`).
> Il est **interdit** d'utiliser `FileText`, `Clock`, `Mic` ou toute autre icône Lucide directement pour représenter un CR.

#### Design Tokens

| Token | Valeur |
|-------|--------|
| **Icône source** | `FileText` (Lucide) |
| **Couleur par défaut** | `#2B6CB0` (bleu) |
| **Épaisseur des traits** | `strokeWidth: 1.6` (−20% vs défaut Lucide de 2) |
| **Props acceptées** | `size` (default 16), `color` (override), `style`, `...rest` |

#### Placements (5 vues)

| Vue | Fichier | Usage | Props |
|-----|---------|-------|-------|
| **Rapport disponible** | `SessionCard.jsx` | Icône à côté du résumé CR | `size={16\|18}` |
| **Rédiger CR** | `SessionCard.jsx` | Badge orange « Rédiger CR » | `size={11}` |
| **Carte urgence** | `DashboardPage.jsx` | `N CR à rédiger` (fond `#EBF8FF`) | `size={18}` |
| **KPI stats** | `ClientDetailPage.jsx` | Compteur « CR en attente » | `size={24} color={warning\|info}` |
| **Label section** | `SessionDetailModal.jsx` | Titre « Compte-rendu » / « Note de préparation » | `size={14}` |


### Icônes de type de client

Chaque client possède un **type** (`individual`, `client/couple`, `family`) affiché par une icône dédiée et des couleurs distinctes.

| Type | Icône | Couleur | Fond | Bordure |
|------|-------|---------|------|---------|
| **Individuel** | `User` (Lucide) | `#6366F1` (Indigo) | `#EEF2FF` | `#C7D2FE` |
| **Couple** | `Users` (Lucide) | `#EC4899` (Rose) | `#FDF2F8` | `#FBCFE8` |
| **Famille** | SVG custom (2 adultes + 1 enfant) | `#F59E0B` (Ambre) | `#FFFBEB` | `#FDE68A` |
| **Prospect** (override) | Hérite de l'icône du type | `#7C3AED` (Violet) | `#F3E8FF` | `#E8D8FE` |

> **Règle absolue — Composant `ClientTypeBadge` obligatoire :**
> Le rendu de toute pastille d'identité client (icône type + couleurs) doit **toujours** utiliser le composant partagé `src/components/ClientTypeBadge.jsx`.
> Il est **interdit** de dupliquer les couleurs ou le SVG famille inline dans les pages consommatrices.
> Ce composant expose 3 exports :
> - `ClientTypeBadge` (default) — pastille circulaire avec icône ou initiales
> - `ClientTypeIcon` — icône seule (sans cercle)
> - `CLIENT_TYPE_STYLES` — objet de lookup des tokens couleurs

#### SVG Famille (icône custom — pas de composant Lucide)

L'icône famille est encapsulée dans `ClientTypeBadge.jsx` via le sous-composant `FamilyIcon`. Le SVG source :

```jsx
<svg width="N" height="N" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
  <circle cx="7" cy="6" r="2.5"/>
  <circle cx="17" cy="6" r="2.5"/>
  <circle cx="12" cy="9" r="2"/>
  <path d="M1 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
  <path d="M15.5 14h3a4.5 4.5 0 0 1 4.5 4.5V20"/>
</svg>
```

> **Règle absolue — Icône famille :**
> L'icône Lucide `Baby` ne doit **jamais** être utilisée pour représenter le type « Famille ». Seul le SVG custom ci-dessus est autorisé. L'icône `Baby` reste réservée au label « Enfants » dans les formulaires d'édition.

#### Tailles selon le contexte

| Contexte | Taille (width/height) | Export utilisé |
|----------|-----------------------|----------------|
| Wizard de création (ClientsPage) | 36–40px | `CLIENT_TYPE_STYLES` |
| Vue cartes (ClientsPage grid) | 22px | `CLIENT_TYPE_STYLES` |
| En-tête fiche client (ClientDetailPage) | 18px | `ClientTypeIcon` |
| Panneau édition (EditIdentityModal) | 15px | `CLIENT_TYPE_STYLES` |
| **Vignette ronde SessionCard** | 40px | `ClientTypeBadge` |
| **Vignette ronde ActionDetailPanel** | 40px (avec bordure) | `ClientTypeBadge` + `showBorder` |
| **Tableau Finances** | 28px | `ClientTypeBadge` |

#### SessionCard — vignette ronde de type client

La vignette ronde (40×40px, `border-radius: 50%`) de chaque `SessionCard` affiche l'icône du type de client via `<ClientTypeBadge type={clientType} size={40} />`.

| Prop `clientType` | Icône | Fond cercle | Couleur icône |
|-------------------|-------|-------------|---------------|
| `'individual'` | `User` | `#EEF2FF` | `#6366F1` |
| `'client'` | `Users` | `#FDF2F8` | `#EC4899` |
| `'family'` | SVG custom | `#FFFBEB` | `#F59E0B` |
| `null` (fallback) | `PhaseIcon` | `phaseColor.bg` | `phaseColor.color` |

> Le type est résolu via `getClientType(client)` (jamais `client.type` brut) pour prendre en compte la présence d'enfants et de partnerB.

#### ActionDetailPanel — carte d'identité client

Chaque item du panneau latéral Dashboard affiche une pastille d'identité via `<ClientTypeBadge type={clientType} size={40} initials={initials} isProspect={isProspect} showBorder />`.

- **Avec initiales** : si `clientInitials` est fourni, elles s'affichent en gras à la place de l'icône type.
- **Mode prospect** : si `isProspect=true`, les couleurs sont overridées par le violet prospect (`#7C3AED` / `#F3E8FF`).
- **Bordure visible** : `showBorder` ajoute un anneau de 2px dans la couleur de bordure du type.

---

## Composants

### Boutons

#### Variantes

| Variante | Fond (actif) | Texte | Usage |
|----------|-------------|-------|-------|
| **Primary** | `#334E68` (primary-700) | blanc | Actions principales (Sauvegarder, Soumettre) |
| **Secondary** | transparent, bordure `#BCCCDC` | bleu marine | Actions secondaires (Annuler, Retour) |
| **Accent** | `#D69E2E` (accent-main) | blanc | Actions spéciales (Nouveau couple, Créer la séance) |
| **Ghost** | transparent | bleu marine | Actions tertiaires (Voir plus, Détails) |
| **Danger** | `#C53030` (error) | blanc | Actions destructives (Supprimer) |

#### 3 états visuels

```
 ┌─────────────────────────┐
 │  + Créer la séance       │   ACTIF     — fond doré #D69E2E, texte blanc
 └─────────────────────────┘

 ┌─────────────────────────┐
 │    Suivant →             │   INACTIF   — fond doré pâle #E8CC8C, texte blanc 60%
 └─────────────────────────┘

 ┌━━━━━━━━━━━━━━━━━━━━━━━━━┓
 ║    Suivant →             ║   HOVER     — fond doré foncé #B7791F, texte blanc
 └━━━━━━━━━━━━━━━━━━━━━━━━━┘
```

| État | Classe CSS | Fond (exemple Accent) | Texte | Curseur | Ombre |
|------|------------|----------------------|-------|---------|-------|
| **Actif** | `.btn-accent` | `#D69E2E` | blanc (`#FFFFFF`) | `pointer` | aucune |
| **Inactif (disabled)** | `.btn:disabled` | fond + `opacity: 0.45` | blanc + `opacity: 0.45` | `not-allowed` | aucune |
| **Chargement (Saving)** | `.btn-saving` | fond + `opacity: 0.7` | "Enregistrement..." + icône spin | `wait` | aucune |
| **Hover** | `.btn-accent:hover` | `#B7791F` (accent-dark) | blanc (`#FFFFFF`) | `pointer` | `0 2px 8px rgba(0,0,0,0.15)` |

> **Règle absolue — Feedback de sauvegarde** : Tout bouton déclenchant une opération asynchrone (Sauvegarder, Enregistrer) doit passer en état **Chargement** (inactif + texte modifié + curseur d'attente) jusqu'à la résolution de la promesse.

> S'applique à **toutes les variantes** : Primary, Accent, Danger utilisent `opacity: 0.45` au disabled ; Secondary et Ghost utilisent `opacity: 0.5`.

#### Propriétés communes

| Propriété | Valeur |
|-----------|--------|
| Radius | 8px |
| Padding | 8px 20px (standard), 16px 24px (`.btn-lg`) |
| Font weight | 500 |
| Font size | 0.875rem (standard), 1rem (`.btn-lg`) |
| Transition | `all 200ms ease` |

### Cartes

```
┌──────────────────────────────────────────┐
│                                          │
│  [Icône]  Titre de la carte              │  ← H3 (16px, 600)
│                                          │
│  Contenu principal de la carte           │  ← Body (14px, 400)
│  avec informations clés                  │
│                                          │
│  🏷️ Tag Phase    📅 Date    ⏱️ Durée     │  ← Caption (12px)
│                                          │
└──────────────────────────────────────────┘

Propriétés :
- Fond : blanc (#FFFFFF)
- Ombre : 0 1px 3px rgba(0,0,0,0.08)
- Ombre hover : 0 4px 12px rgba(0,0,0,0.12)
- Radius : 12px
- Padding : 8px
- Transition hover : 200ms ease

**Hiérarchie date/heure dans les cartes séance :**
- **Élément principal** (nom client ou date) : `fontWeight: 600`, couleur par défaut
- **Heure** : `fontWeight: 500`, couleur `var(--text-secondary)`, aligné baseline avec l'élément principal
```

### Tags / Badges de phase

| Phase | Couleur fond | Couleur texte | Icône Lucide |
|-------|-------------|---------------|-------------|
| **Prospect** | `#F5F0FF` | `#6B46C1` | — |
| **Début** | `#EBF8FF` | `#2B6CB0` | `Sprout` (16px) |
| **Analyse** | `#FEFCBF` | `#975A16` | `Search` (16px) |
| **Intégration** | `#F0FFF4` | `#276749` | `Target` (16px) |

> **Règle absolue — Résolution de phase centralisée :**
> L'accès aux couleurs et icônes de phase doit **toujours** passer par `getPhaseColor(key)` et `getPhaseIcon(key)` exposés par `DataContext`.
> Il est **interdit** d'écrire un fallback local du type `phaseColors[x] || { … }` dans les composants.
> Cela garantit un fallback unique (`defaultPhaseKey → debut`) sur toutes les vues.

> **Règle absolue — Composant SessionCard unique :**
> Le rendu d'une carte de séance (accueil, fiche client, ou toute autre vue) doit **toujours** utiliser le composant `src/components/session/SessionCard.jsx`.
> Il est **interdit** de dupliquer le JSX de rendu de séance dans les pages consommatrices.
> Toute modification visuelle d'une carte de séance doit se faire **exclusivement** dans `SessionCard.jsx`.
> **Contrainte de dimension** : La carte doit toujours avoir `width: 100%` pour remplir son conteneur et permettre l'alignement correct des icônes à droite.
> Les différences contextuelles (nom du client, style étendu) sont gérées par les props `showClientName`, `showExpandedStyle`, `dimmed`, `isProspect`, `clientType`.
> - **Badge Prospect** : Si le client est un prospect, un badge violet « PROSPECT » s'affiche à côté de son nom (quand `showClientName` est activé).

> **Règle absolue — Affichage de l'heure et icônes sur SessionCard :**
> - Pour les **séances planifiées** : 
>   - L'heure est **masquée** dans la zone de titre pour être affichée à **droite**.
>   - L'icône de document (`FileText`) ne s'affiche **que** pour les séances passées ayant un contenu. Elle est masquée pour les séances futures pour éviter toute confusion avec une note de préparation.
>   - **Aperçu CR / Préparation** : Limité selon le contexte pour préserver l'équilibre visuel.
>     - **Dashboard / Agenda (Liste)** : **50 caractères**.
>     - **Timeline thérapie** : **35 caractères** (plus compact).
>   - **Format** : Aucun préfixe (pas de « S1 : »).
>     - Pour les **séances programmées** : inclure la durée au format `[DURÉE] MIN : [Texte]`.
>   - **Position** : Toujours **aligné à droite**, à proximité immédiate de l'icône de document ou de l'horloge.
>   - **Espace visuel** : Le conteneur doit permettre d'afficher ces caractères (~300-400px de `maxWidth`).
>   - L'ordre des éléments à droite est : `[Espaceur flexible] [Heure] [🕐 Clock (bord droit)]`.
> - Pour les **séances passées** (y compris celles encore en statut `scheduled` / « à confirmer ») : l'heure est **toujours** affichée dans le titre (à côté du nom/date).
> - **Alignement** : Un espaceur flexible (`flex: 1`) garantit que le bloc d'icônes/heure de droite est toujours collé au bord droit de la carte.

> **Règle absolue — Composant NewClientButton unique :**
> Le bouton « Nouveau client » doit **toujours** utiliser le composant `src/components/NewClientButton.jsx`.
> Style doré `btn-accent`, icône `UserPlus` blanche. Utilisé sur Dashboard et Mes Clients.
> Props : `onClick`, `label` (défaut « Nouveau client »).
> Les boutons de création client dans d'autres contextes (Réseau Pro) ne sont **pas** des boutons « Nouveau client » et ne doivent pas utiliser ce composant.

> **Règle absolue — Composant AddSessionButton unique :**
> Le bouton « Ajouter une séance » doit **toujours** utiliser le composant `src/components/AddSessionButton.jsx`.
> Style bleu secondaire : `background: var(--primary-100)`, `color: var(--primary-700)`, `border: 1px solid var(--primary-200)`, icône `Plus`.
> Props : `onClick`, `label` (défaut « Ajouter une séance »).

> **Règle absolue — Composant ViewSwitcher unique :**
> Tout sélecteur de vue (Liste, Calendrier, Cartes) doit **obligatoirement** utiliser le composant `src/components/layout/ViewSwitcher.jsx`.
> **Style** : Les boutons utilisent `btn-primary` (fond bleu marine, icône blanche) pour l'état actif et `btn-secondary` (fond clair, icône `--primary-600`) pour l'état inactif.
> **Icônes standard** : `LayoutList` (Vue liste), `Calendar` (Vue calendrier), `LayoutGrid` (Vue cartes).

### Navigation Temporelle (Contrôles fléchés)
Utilisé pour naviguer entre les périodes (mois, années) dans les tableaux de bord.

- **Structure** : `[Bouton flèche gauche] [Label central] [Bouton flèche droite]`
- **Boutons** : `background: white`, `border: 1px solid var(--border-light)`, `borderRadius: var(--radius-sm)`, `padding: 4px`, `cursor: pointer`.
- **Icônes** : `ChevronLeft` / `ChevronRight` (14px).
- **Label** : `fontSize: 0.786rem`, `fontWeight: 600`, `minWidth: 60px` (année) à `100px` (mois), `textAlign: center`.

### Carte séance active (timeline thérapie)

Quand l'utilisateur clique sur une séance dans la timeline de la fiche client, la carte passe en surbrillance dorée et le panneau `SessionDetailModal` s'ouvre à droite. Props : `isExpanded={true}`, `showExpandedStyle={true}`.

```
  Carte inactive :
  ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
  ╎  [●]  26 mars 2026  14:00                   🎤  ╎  ← Bordure dashed, fond blanc/bleu pâle
  └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘

  Carte active (sélectionnée) :
  ┃ ┌──────────────────────────────────────────────┐
  ┃ │  [●]  26 mars 2026  14:00                 🎤  │  ← Fond doré, bordure dorée, barre gauche
  ┃ └──────────────────────────────────────────────┘
```

| Propriété | Carte inactive | Carte active (`isExpanded`) |
|-----------|---------------|----------------------------|
| **Fond** | `white` (future) / `var(--primary-50)` (passée) | `rgba(218, 165, 32, 0.12)` |
| **Bordure** | `1px dashed var(--border-light)` (future) / `none` (passée) | `1px solid var(--accent-main)` |
| **Bordure gauche** | aucune | `3px solid var(--accent-main)` |
| **Ombre** | `0 1px 3px rgba(0,0,0,0.08)` | `0 1px 4px rgba(196, 167, 103, 0.25)` |

> La surbrillance dorée reprend la couleur `--accent-main` (`#D69E2E`) du design system, assurant la cohérence avec les autres accents chauds de l'interface.

### Mode sélection (suppression groupée)

Disponible uniquement sur l'onglet **« En cours »** du calendrier d'accueil.

```
  Mode inactif :
  ┌──────────────────────────────────────────────┐
  │  [●]  Nom Client  14:00                  ⏱   │  ← Carte normale, clic = navigation
  └──────────────────────────────────────────────┘

  Mode sélection actif :
  ☐ ┌──────────────────────────────────────────────┐
     │  [●]  Nom Client  14:00                  ⏱   │  ← Clic = sélection (pas de navigation)
     └──────────────────────────────────────────────┘

  Séance sélectionnée :
  ☑ ┌──────────────────────────────────────────────┐
     │  [●]  Nom Client  14:00                  ⏱   │  ← Checkbox cochée en rouge
     └──────────────────────────────────────────────┘
```

| Élément | État non sélectionné | État sélectionné |
|---------|---------------------|-----------------|
| **Checkbox** | Icône `Square` (18px) | Icône `CheckSquare` (18px) |
| **Couleur checkbox** | `var(--text-tertiary)` | `var(--error)` |
| **Transition** | `color 0.15s ease` | `color 0.15s ease` |
| **Carte séance** | Style normal (aucun changement) | Style normal (aucun changement) |
| **Clic sur carte** | `toggleSelect(session.id)` | `toggleSelect(session.id)` |

#### Bouton « Sélectionner / Annuler »

| État | Texte | Icône | Couleur | Bordure |
|------|-------|-------|---------|---------|
| **Inactif** | « Sélectionner » | `CheckSquare` (12px) | `var(--text-secondary)` | `1px solid var(--border-light)` |
| **Actif** | « Annuler » | `X` (12px) | `var(--error)` | `1px solid var(--error)` |

#### Barre d'action flottante (Sélection groupée)

| Propriété | Aucune sélection | Sélection active |
|-----------|-----------------|----------------------|
| **Fond** | `var(--primary-50)` | `var(--error-bg)` (Rouge pâle) |
| **Bordure** | `1px solid var(--border-light)` | `1px solid var(--error)` |
| **Texte compteur** | `var(--text-secondary)` | `var(--error)` |
| **Boutons d'action** | `opacity: 0.5` | `opacity: 1`, couleur `white` sur fond rouge |

- **Usage** : Ce composant est le standard pour **tous** les traitements de masse (Suppression groupée dans les Archives, le Calendrier, ou le Réseau Pro).
- **Position** : Fixe en bas de l'écran, centré.
- **Radius** : `var(--radius-full)` (forme pilule).
- **Ombre** : `0 10px 30px rgba(239, 68, 68, 0.3)`.
- **Confirmation** : Toute action destructive via cette barre nécessite une validation par `ConfirmDialog`.

## Tableaux de données (Tableau Standard)

Le format « Tableau Standard » s'applique à **tous** les tableaux de l'application (listes de clients, finances, rapports, etc.), qu'ils supportent la sélection multiple ou non. Il garantit une lisibilité maximale et une cohérence visuelle.

### Structure et Conteneur
- **Enveloppe** : Le tableau doit être contenu dans une `card` avec `overflow: hidden` et `border: 1px solid var(--border-light)`.
- **Largeur** : Toujours `width: 100%` avec `border-collapse: collapse`.

### En-tête (Header)
- **Ligne d'en-tête (`thead tr`)** : Fond bleu clair obligatoire : `background: var(--primary-50)`.
- **Cellules d'en-tête (`th`)** :
    - **Typography** : `fontSize: 0.714rem`, `fontWeight: 600`, `textTransform: uppercase`, `letterSpacing: 0.04em`.
    - **Couleur** : `var(--text-secondary)`.
    - **Padding** : `10px 14px`.
    - **Alignement** : Gauche par défaut (`textAlign: left`), sauf pour les colonnes d'actions (droite).

### Corps du tableau (Body)
- **Cellules (`td`)** :
    - **Padding** : `10px 14px` (identique au header pour l'alignement vertical).
    - **Typographie** : `Body` (14px) pour les noms, `Body Small` (13px) pour les données secondaires.
    - **Alignement vertical** : `verticalAlign: middle`.
- **Bordures** : Séparation des lignes par `border-bottom: 1px solid var(--border-light)`.
- **Survol (Hover)** : La ligne entière change de fond au survol : `background: var(--primary-50)` (transition `100ms`).

### États de sélection
- **Ligne sélectionnée** : Fond `var(--primary-50)` permanent tant que la ligne est cochée.
- **Checkbox** : Lucide `Square` / `CheckSquare`, passe en rouge `var(--error)` dès qu'elle est cochée.

### Flexibilité des colonnes
- La structure des colonnes doit s'adapter aux besoins (ex: « Dernier RDV », « Spécialité »).
- Les colonnes `NOM` (avec avatar) et `PHASE` (avec badge) restent les points d'ancrage visuels quand elles sont présentes.

### Notifications & Alertes

| Type | Icône Lucide | Couleur barre gauche | Fond |
|------|-------------|---------------------|------|
| **Info** | `Info` | `#3182CE` | `#EBF8FF` |
| **Succès** | `CheckCircle` | `#38A169` | `#F0FFF4` |
| **Attention** | `AlertTriangle` | `#D69E2E` | `#FFFFF0` |
| **Urgent** | `AlertCircle` | `#C53030` | `#FFF5F5` |

### Alerte « Séance à confirmer » — Standard canonique

> [!IMPORTANT]
> **Ce design est le standard unique** pour toute alerte « à confirmer » dans l'application.
> Toute nouvelle occurrence doit **obligatoirement** respecter ces tokens exacts.

#### Design Tokens

| Token | Valeur | Usage |
|-------|--------|-------|
| **Couleur texte + icône** | `#D97706` | Icône ET texte — **aucune variante autorisée** (interdit : `#B7791F`, `#92400E`) |
| **Fond** | `#FFFBEB` | Background bannière, badge compteur, carte urgence |
| **Bordure** | `1px solid #FEF3C7` | Bordure des bannières d'alerte |
| **Fond badge compteur** | `#FEF3C7` | Pastille ronde de comptage (ex: « 2 ») |
| **Icône** | `HelpCircle` (Lucide) | Icône **obligatoire** — taille 9-16px selon le contexte |
| **Police** | `fontWeight: 600`, `fontSize: 0.643-0.786rem` | Gras semi-bold, taille selon le contexte |

#### Placements obligatoires (7 vues)

| # | Vue | Composant | Élément rendu |
|---|-----|-----------|---------------|
| 1 | **SessionCard** (badge) | `SessionCard.jsx` | `<HelpCircle size={9} /> CONFIRMER` |
| 2 | **Fiche client — alerte globale** | `ClientDetailPage.jsx` | `<HelpCircle size={14} /> Séances à confirmer : N séances` |
| 3 | **Fiche client — badge par séance** | `ClientDetailPage.jsx` | `<HelpCircle size={9} /> À CONFIRMER / À RÉGLER` |
| 4 | **Modale détail séance** | `SessionDetailModal.jsx` | `<HelpCircle size={14} /> Séance à confirmer — Veuillez renseigner...` |
| 5 | **Dashboard — carte urgence** | `DashboardPage.jsx` | Carte `HelpCircle` + `N paiements à confirmer` |
| 7 | **Finances — tableau détail** | `FinancesPage.jsx` | Badge texte `À confirmer` (fond `#FFFBEB`, couleur `#D97706`) |

### Alerte « Facture à émettre » (signalétique bleu profond)

Icône custom **SVG document + symbole €** utilisée **systématiquement** pour représenter les factures à émettre. Il est **interdit** d'utiliser une icône Lucide standard (`FileText`, `Receipt`) pour cette signalétique.

#### SVG canonique (icône facture)

```jsx
<svg width="N" height="N" viewBox="0 0 24 24" fill="none" stroke="#1A365D"
  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <polyline points="14 2 14 8 20 8" />
  <text x="12" y="17" textAnchor="middle" fill="#1A365D" stroke="none"
    fontSize="10" fontWeight="800">€</text>
</svg>
```

#### Couleurs

| Token | Valeur | Usage |
|-------|--------|-------|
| **Couleur icône/texte** | `var(--primary-500)` (Bleu) | Icône SVG, libellés, compteurs |
| **Fond alerte** | `#EBF8FF` (Bleu très pâle) | Background des bandeaux d'alerte |
| **Bordure** | `#BEE3F8` | Bordure des bandeaux d'alerte |

#### Emplacements

| Vue | Élément | Taille icône |
|-----|---------|--------------|
| **Dashboard — Action requise** | Carte urgence « N facture(s) à envoyer » | 18px |
| **Fiche client — Comptabilité** | Bandeau alerte « Factures à émettre : N séances » | 16px |

> **Règle absolue** : La couleur `var(--primary-500)` est la référence unique pour toute la signalétique de facturation en attente. Ne jamais utiliser d'autres nuances de bleu non standard pour ces éléments.

### Badge « FACTURE »

| État | Libellé | Couleur Texte | Fond |
|------|---------|---------------|------|
| **À émettre** | « À émettre » | `var(--primary-500)` (Bleu) | `#EBF8FF` + bordure `#BEE3F8` |
| **Facturée** | « Facturée » | `var(--success)` (#38A169) | transparent |

### Badge « ANNULATION »

| État | Couleur Texte | Fond | Libellé |
|------|---------------|------|---------|
| **OFFERTE** | `var(--error)` | transparent | « SÉANCE OFFERTE » |
| **FACTURÉE** | `var(--error)` | transparent | **« ANNULATION FACTURÉE »** |

**Propriétés** : `fontSize: 0.643rem`, `fontWeight: 600`, `letterSpacing: 0.02em`.

> ⚠️ **Règle absolue** : Le libellé « Annulation tardive » est proscrit. Seul le terme **« Annulation facturée »** doit être utilisé pour les séances annulées avec maintien du tarif.

> ⚠️ **Règle absolue** : ne jamais utiliser `#92400E` ou toute autre nuance de brun pour ces éléments. La couleur `#D97706` est la référence unique pour toute la signalétique de confirmation.

---

## Formulaires

### Inputs standards

| Propriété | Valeur |
|-----------|--------|
| Bordure | 1px solid `var(--border-medium)` |
| Radius | 8px |
| Padding | 8px 16px |
| Font size | 0.929rem |
| Fond | Blanc (`#FFFFFF`) |
| Focus | Bordure `var(--primary-300)` + ombre `rgba(95,126,179,0.12)` |
| Placeholder | Couleur `var(--text-tertiary)` |

### Champs obligatoires

Style visuel pour tout champ dont la saisie est requise :

```
  Nom *                          ← label + astérisque rouge
  ┌──────────────────────────┐
  │  Nom                     │   ← bordure rouge douce
  └──────────────────────────┘
```

| Élément | Style | Classe CSS |
|---------|-------|------------|
| **Label** | Astérisque rouge ` *` ajouté automatiquement via `::after` | `.label-required` |
| **Input** | Bordure `var(--error)` (`#C53030`) | `.input-required` |
| **Input focus** | Bordure `var(--error)` + ombre `rgba(197,48,48,0.12)` | `.input-required:focus` |

#### Usage

```jsx
{/* Label avec astérisque automatique */}
<label className="label-required">Nom du client</label>

{/* Input avec bordure rouge permanente */}
<input className="input input-required" />

{/* Bordure rouge conditionnelle (vide = erreur) */}
<input className={`input${!value.trim() ? ' input-required' : ''}`} />
```

#### Règles d'application
- Tout champ dont la validation est bloquante **doit** utiliser `.label-required`
- La bordure rouge (`.input-required`) s'applique **en permanence** sur les champs toujours obligatoires, ou **conditionnellement** (quand le champ est vide) pour les validations au fil de la saisie
- Couleur de l'astérisque et de la bordure : `--error` (`#C53030`) — le rouge doux de la palette sémantique

---

## Modale de Confirmation / Alerte

Remplace les `confirm()` et `alert()` natifs du navigateur. Toutes les fenêtres de confirmation et d'alerte utilisent ce composant.

### Structure

```
┌──────────────────────────────────────┐
│  ❤️ CoachCRM                    ✕   │  ← Header avec logo + bouton fermer
├──────────────────────────────────────┤
│                                      │
│              ⚠️                      │  ← Icône dans cercle (doré ou rouge)
│                                      │
│      Titre optionnel (H3)            │
│                                      │
│   Message explicatif en texte        │  ← Corps du message
│   secondaire, centré                 │
│                                      │
├──────────────────────────────────────┤
│                    [Annuler] [OK]    │  ← Footer avec boutons
└──────────────────────────────────────┘
```

### Propriétés visuelles

| Propriété | Valeur |
|-----------|--------|
| Fond | Blanc (`--bg-card`) |
| Largeur | 420px (max 90vw) |
| Radius | 16px (`--radius-lg`) |
| Ombre | `0 20px 60px rgba(0,0,0,0.2)` |
| Animation | `modalIn` 250ms ease |
| Z-index | 9999 |

### 3 variantes

| Variante | Icône cercle | Bouton principal | Usage |
|----------|-------------|-----------------|-------|
| **confirm** | Doré (`#FFFFF0` / `--accent-main`) | `.btn-primary` (bleu) | Confirmations courantes |
| **alert** | Doré | `.btn-primary` + texte "Compris" | Messages informatifs (pas de bouton Annuler) |
| **danger** | Rouge (`--error-bg` / `--error`) | `.btn-danger` (rouge) | Actions destructives irréversibles |

### 11. Barre d'action flottante (Sélection Multiple)
- **Couleur** : Bordure `var(--error)`, texte d'état `var(--error)`.
- **Bouton** : `.btn-danger` (rouge).
- **Position** : Collé au bas du tableau ou de la zone de contenu s'il y a une sélection active.

---

## Modèles de Pages Spécifiques

### Tableau de Bord (Pilotage)
- **Layout** : Grid principal `66fr 34fr`.
- **Bloc Statistiques Globales** :
  - **Position** : En haut de la colonne de droite, au-dessus des actions requises.
  - **Structure** : Grille compacte 3×2 de 6 KPIs.
  - **KPIs** :
    | KPI | Icône | Couleur icône |
    |-----|-------|---------------|
    | Clients actifs | `Heart` | `var(--primary-600)` |
    | Prospects | `Sprout` | `#7C3AED` |
    | Séances ce mois | `Calendar` | `var(--accent-main)` |
    | CA du mois | `Euro` | `var(--success)` |
    | Tx conversion | `TrendingUp` | `#6366F1` |
    | Parrains | `UserCheck` | `#EC4899` |
  - **Style** : Fond `var(--primary-50)`, bordure `var(--border-light)`, radius `var(--radius-md)`, padding compact `8px 10px`.
- **Action requise (Side-block)** :
  - Bloc d'alerte prioritaire sous les statistiques.
  - Items : `.card` interne ou div avec background thématique (Orange/Ambre/Bleu).
  - Hover : Translation horizontale (`translateX(4px)`) et renforcement de la bordure (`1px solid var(--color)`).
  - Icônes : `AlertCircle` (18px) pour le header, icônes thématiques pour les items.
- **Mon agenda** :
  - Section principale à gauche.
  - Titre épuré : "Mon agenda" (icône Calendar var(--primary-700)).
  - Boutons d'action rapides (Ajouter séance, Nouveau client) alignés à droite dans le header.
- **Blocs de Pilotage (Relance prospects)** :
  - Sous les actions urgentes.
  - **Détails prospect** : Affiche le nom (cliquable), et juste en dessous, le dernier contact.
  - **Icônes de contact** : `Phone` (SMS), `Mail` (Email), `PhoneCall` (Appel). Couleur `var(--text-tertiary)`, taille `12px`.
  - **Inactivité** : Si aucun contact, affiche « Inactif depuis : Création ».
  - Lignes interactives : fond `var(--primary-50)` par défaut, au survol : fond `white` + bordure `1px solid var(--border-medium)`.
- **Navigation Contextuelle (Smart Back)** :
  - Les pages de détail (fiche client, rapport) mémorisent leur provenance via `location.state.from`.
  - Le bouton **« Retour »** s'adapte : il renvoie au Dashboard direct si l'utilisateur en vient (Pilotage), sinon il remonte à la liste parente.

### Graphiques et Exports (Finances — Pilotage)
- **Couleur des icônes** : Les icônes des sections « Canaux d'acquisition », « Types de clients », « Export suivi financier » et « Export Parrainages » sont toutes en **bleu** (`var(--primary-500)`).
- **Couleur des barres** : Toutes les barres des graphiques sont d'une couleur uniforme **gris** (`#A0AEC0`). Aucune barre colorée par catégorie.
- **Fond de barre** : `#F0F0F0`, `border-radius: var(--radius-sm)`.
- **Valeur numérique** : Couleur grise `#A0AEC0`, à droite de la barre.

### Indicateur de Transformation (Finances)
- **Objectif** : Visualiser l'efficacité de l'onboarding prospect.
- **Structure** :
    - **En-tête** : Titre "Transformation Prospects" avec l'icône `Zap` (doré `#D69E2E`) à gauche.
    - **KPIs** : Aucun pourcentage de conversion affiché (choix de sobriété).
    - **Liste des transformations** : Liste verticale numérotée (`1. Nom du Client (Date)`).
    - **Détails** : Affichage de la date de la première séance en texte léger à droite du nom.
- **Interactivité** : Clic sur le nom du client ouvre son dossier.
- **Contrainte visuelle** : Pas de lignes de séparation horizontales, pas de sous-titres de type "Dernière transformation".
- **Structure** : Grid de 7 colonnes (L-D).
- **Cellules** : Bordure `1px solid var(--border-light)`, aspect ratio carré ou légèrement vertical.
- **Header** : Nom du jour en `Caption` uppercase.
- **Contenu** : Chaque séance est une pastille miniature :
  - **Dossier client** : Fond `var(--primary-50)`, texte `var(--primary-700)`.
  - **Prospect** : Fond `#F5F0FF`, texte `#6B46C1`.
  - **Status** : Si `scheduled` et passée sans CR → indicateur ambre discret.
- **Interactivité** : Clic sur une séance ouvre le `SessionDetailModal`.

### Classe CSS : `.confirm-dialog`

```jsx
{/* Confirmation simple */}
const ok = await confirm('Annuler cette séance ?')

{/* Alerte (pas de bouton Annuler) */}
await confirm('Erreur lors de la suppression.', { variant: 'alert' })

{/* Action dangereuse */}
const ok = await confirm('Cette action est irréversible.', {
  title: '⚠️ SUPPRESSION DÉFINITIVE',
  variant: 'danger'
})
```

---

## Responsive

| Breakpoint | Largeur | Comportement |
|------------|---------|-------------|
| **Mobile** | < 768px | Sidebar cachée (hamburger), layout une colonne |
| **Tablet** | 768-1024px | Sidebar rétractée (icônes), layout adaptable |
| **Desktop** | > 1024px | Sidebar complète, layout multi-colonnes |

---

## Identité Visuelle « Administration »

| Élément | Style | Icône |
|---------|-------|-------|
| **Logo Admin** | `#D69E2E` (accent-main) | `Crown` |
| **Badge Admin** | Fond `#FEF5E7`, texte `#B7791F` | `Crown` (12px) |
| **Statistiques** | Standard stat-card (Icons Success/Error/Primary) | — |

### Page Clients Archivés
- **Couleur dominante** : `var(--error)` (#C53030) pour les actions destructives.
- **Barre de masse** : Fond `var(--error-bg)`, bordure `var(--error)`, texte rouge.

---

## Page d'Accueil — Structure

```
┌──────────┬──────────────────────────────────────────────────┐
│          │  Bonjour [Prénom] · Jeudi 19 mars                  │
│  S       │                                                    │
│  I       │  ┌─────────────────┐  ┌────────────────────────┐  │
│  D       │  │ [Calendar]       │  │ [BarChart3]            │  │
│  E       │  │ AGENDA DU JOUR   │  │ APERÇU RAPIDE          │  │
│  B       │  │                  │  │                        │  │
│  A       │  │ 14:00 Couple A  │  │ [Heart] 20 actifs      │  │
│  R       │  │ 16:00 Couple B  │  │ [Clock] 3 CR attente   │  │
│          │  │ 18:30 Couple C  │  │ [PenTool] 2 exercices  │  │
│ [Home]   │  └─────────────────┘  └────────────────────────┘  │
│ [Users]  │                                                    │
│ [Mic]    │  ┌──────────────────────────────────────────────┐  │
│ [FileText│  │ [FileText] DERNIERS COMPTES RENDUS            │  │
│ [BookOpen]│  │                                              │  │
│ [Settings│  │  Couple Dupont · S#12 · il y a 2h   → Voir  │  │
│          │  │  Couple Martin · S#8  · hier        → Voir  │  │
│          │  │  Couple Rey    · S#15 · il y a 3j   → Voir  │  │
│          │  └──────────────────────────────────────────────┘  │
└──────────┴──────────────────────────────────────────────────┘
```

---

## Structure de la Sidebar

```
SIDEBAR (fond bleu marine #243B53)
Icones Lucide React — 22px — couleur #D9E2EC

┌──────────────────────────┐
│  [Heart] CoachCRM        │  ← Logo + nom
│                          │
│  ──────────────────────  │
│                          │
│  [Home]     Accueil      │  ← Agenda + derniers CR
│  [Users]    Mes Couples  │  ← Liste & fiches couples
│  [Mic]      Séances      │  ← Upload audio & CR
│  [FileText] Comptes R.   │  ← Tous les CR
│                          │
│  ──────────────────────  │
│                          │
│  [BookOpen] Méthodologie │  ← Fiches méthodologiques
│  [Brain]    IA Assistant │  ← Chat IA (V2)
│                          │
│  ──────────────────────  │
│                          │
│  [Settings] Paramètres   │  ← Profil, préférences
│  [HelpCircle] Aide       │
│                          │
│  ─── Mode Admin ───────  │  (visible uniquement admin)
│  [Crown] Administration  │
│                          │
└──────────────────────────┘
```

---

## Micro-animations

| Interaction | Animation | Durée |
|-------------|-----------|-------|
| Hover carte | Élévation ombre + légère remontée (2px) | 200ms |
| Ouverture modale | Fade in + scale de 0.95 à 1 | 250ms |
| Transition de page | Fade in doux | 150ms |
| Notification | Slide in depuis le haut | 300ms |
| Upload audio | Progress bar avec pulse doré | Continue |
| Sidebar toggle | Slide horizontal | 200ms |
| Indicateur de chargement | Skeleton loader (shimmer) | Continue |

---

## Composants spécifiques

### DuplicateAlert — Aperçu compact
- Chaque doublon est une **carte extensible** avec nom + score de similarité
- Bouton **« Voir / Masquer »** déploie un aperçu inline :
  - Badge de phase (couleur contextuelle via `getPhaseColor`) + type client + nombre de séances
  - Grille contacts 2 colonnes : nom, téléphone, email par partenaire
  - Date de création + lien **« Ouvrir la fiche complète ↗ »** (nouvel onglet)
- Un seul aperçu ouvert à la fois (toggle mutuel)
- Couleurs : fond `#FFF8EE`, bordure `var(--accent-warm)`, icône `AlertTriangle` dorée

### Parrainage professionnel
- Lors de la création d'un client filleul avec source = Parrainage + type = Professionnel :
  - Si le professionnel **existe déjà** (matching nom/prénom) → mise à jour de ses referrals
  - Si le professionnel **n'existe pas** → création dans la table `professionals` via `createPro()`
  - Lien `parrainage-pro` avec `proId` créé sur le client filleul

### Boutons-toggle & Switches — Style épuré Bleu Marine (obligatoire)
- **Règle absolue** : tous les groupes de boutons-toggle (sélection exclusive) et les switches de statut utilisent le style **épuré** (pas d'ombres) avec le Bleu Marine comme couleur d'accentuation.
- **Désactivation des ombres** : il est strictement interdit d'appliquer des `box-shadow` sur les rails ou les boutons/knobs des toggles.
- **État non sélectionné** : `border: 2px solid transparent` (filigrane) ou `background: var(--primary-100)` (switch), aucun contour visible.
- **État sélectionné (Actif)** : `background: var(--primary-800)` (Bleu Marine) ou `border: 2px solid var(--primary-800)`.
- **État sélectionné (Inactif)** : `border: 2px solid var(--primary-300)` (Bleu/Gris) — fond légèrement teinté.
- **Hover (non sélectionné)** : bordure à 40% de la couleur (`+ '60'`) + fond teinté léger.
- **Exemples d'application** : Statut client (Actif/Inactif), réglages de notifications, mode de paiement, type de client.
- **Anti-pattern** : ne jamais utiliser de doré, de vert ou de rouge pour les toggles simples de statut ou de configuration (utiliser exclusivement Bleu Marine / Gris).
- **Montants (Finances)** :
    - **Passé/Réalisé** : `var(--text-primary)` (noir/bleu sombre).
    - **Prévisionnel (Scheduled)** : `var(--text-tertiary)` (gris clair).
    - **Impayé** : `var(--error)` (rouge).
- **Statut séance (Finances — colonne Statut)** :

| Statut | Couleur texte | Fond | Libellé |
|--------|--------------|------|---------|
| **Réalisée** | `var(--success)` (`#38A169`) | transparent | « Réalisée » |
| **À confirmer** | `#D97706` (ambre) | `#FFFBEB` | « À confirmer » |
| **Planifiée** | `var(--text-tertiary)` | `#F0F0F0` | « Planifiée » |
| **Annulée** | `var(--error)` | `#FED7D7` | « Annulée » / « Annulation facturée » |

> **Règle** : Le vert `var(--success)` (`#38A169`) est la couleur unique pour tout indicateur positif dans le suivi financier : statut « Réalisée », labels de paiement reçu (« Chèque », « Virement »), et badge « Encaissé ».

---

> **Résumé en une phrase** : Une interface **bleu marine et or**, **arrondie et aérée** comme Notion, avec la **chaleur humaine** d'Airbnb et l'**organisation claire** de Monday — des **icônes Lucide React professionnelles** (pas d'emojis), conçue pour que chaque thérapeute se sente immédiatement chez soi.
