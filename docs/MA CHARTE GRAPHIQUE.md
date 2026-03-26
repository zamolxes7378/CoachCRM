# CoachCRM — Design System
## Charte Graphique & Système de Design

> **Date** : 19 mars 2026
> **Basé sur** : Interview préférences graphiques fondatrice
> **Mots-clés** : Bienveillant · Simple · Créatif
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
| CR en attente | Horloge | `Clock` |
| Exercice | Crayon | `PenTool` |
| Progrès | Tendance haute | `TrendingUp` |
| Vigilance | Triangle alerte | `AlertTriangle` |
| Succès | Coche cercle | `CheckCircle` |
| Erreur | X cercle | `XCircle` |
| Nouveau | Plus | `Plus` |
| Voir plus | Flèche droite | `ArrowRight` |
| Fermer | X | `X` |

---

## Composants

### Boutons

| Variante | Style | Usage |
|----------|-------|-------|
| **Primary** | Fond bleu marine `#334E68`, texte blanc, radius 8px | Actions principales (Sauvegarder, Soumettre) |
| **Secondary** | Fond transparent, bordure bleu marine, texte bleu | Actions secondaires (Annuler, Retour) |
| **Accent** | Fond doré `#D69E2E`, texte blanc | Actions spéciales (Nouveau couple, Upload audio) |
| **Ghost** | Aucun fond ni bordure, texte bleu | Actions tertiaires (Voir plus, Détails) |
| **Danger** | Fond rouge doux `#C53030`, texte blanc | Actions destructives (Supprimer) |

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
- Padding : 16px
- Transition hover : 200ms ease
```

### Tags / Badges de phase

| Phase | Couleur fond | Couleur texte | Icône Lucide |
|-------|-------------|---------------|-------------|
| **Début** | `#EBF8FF` | `#2B6CB0` | `Sprout` (16px) |
| **Analyse** | `#FEFCBF` | `#975A16` | `Search` (16px) |
| **Intégration** | `#F0FFF4` | `#276749` | `Target` (16px) |

### Notifications & Alertes

| Type | Icône Lucide | Couleur barre gauche | Fond |
|------|-------------|---------------------|------|
| **Info** | `Info` | `#3182CE` | `#EBF8FF` |
| **Succès** | `CheckCircle` | `#38A169` | `#F0FFF4` |
| **Attention** | `AlertTriangle` | `#D69E2E` | `#FFFFF0` |
| **Urgent** | `AlertCircle` | `#C53030` | `#FFF5F5` |

---

## Responsive

| Breakpoint | Largeur | Comportement |
|------------|---------|-------------|
| **Mobile** | < 768px | Sidebar cachée (hamburger), layout une colonne |
| **Tablet** | 768-1024px | Sidebar rétractée (icônes), layout adaptable |
| **Desktop** | > 1024px | Sidebar complète, layout multi-colonnes |

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

> **Résumé en une phrase** : Une interface **bleu marine et or**, **arrondie et aérée** comme Notion, avec la **chaleur humaine** d'Airbnb et l'**organisation claire** de Monday — des **icônes Lucide React professionnelles** (pas d'emojis), conçue pour que chaque thérapeute se sente immédiatement chez soi.
