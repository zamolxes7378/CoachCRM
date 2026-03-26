# Charte Graphique — CoachCRM

> Design System : **Bleu Marine + Or · Arrondi · Plus Jakarta Sans**
> Fichier source : `src/index.css`

---

## 1. Palette de couleurs

### Primary — Bleu Marine Doux

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary-50` | `#F0F4F8` | Fond survol, fond clair |
| `--primary-100` | `#D9E2EC` | Barre de progression fond |
| `--primary-200` | `#BCCCDC` | Avatar inactif fond |
| `--primary-300` | `#9FB3C8` | Focus input, timeline dot |
| `--primary-400` | `#829AB1` | — |
| `--primary-500` | `#627D98` | Focus input bordure |
| `--primary-600` | `#486581` | Icône card, bouton ghost |
| `--primary-700` | `#334E68` | Bouton primaire, onglet actif |
| `--primary-800` | `#243B53` | Bouton primaire hover, sidebar fond |
| `--primary-900` | `#102A43` | Login page fond |

### Accent — Or / Terracotta

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-light` | `#FBD38D` | — |
| `--accent-main` | `#D69E2E` | Bouton accent, avatar actif, logo, timeline active |
| `--accent-dark` | `#B7791F` | Bouton accent hover |
| `--accent-warm` | `#C05621` | Agenda dot |

### Sémantiques

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` / `--success-bg` | `#38A169` / `#F0FFF4` | Badge actif, statut complété |
| `--warning` / `--warning-bg` | `#D69E2E` / `#FFFFF0` | Alertes, badges analyse |
| `--error` / `--error-bg` | `#C53030` / `#FFF5F5` | Bouton danger, statut inactif |
| `--info` / `--info-bg` | `#3182CE` / `#EBF8FF` | Badge début, stat icon info |

### Surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | `#FAFBFC` | Fond de page |
| `--bg-card` | `#FFFFFF` | Fond de carte |
| `--bg-sidebar` | `#243B53` | Sidebar |
| `--bg-sidebar-hover` | `#2D4A63` | Sidebar lien survol |
| `--bg-sidebar-active` | `#1A2F43` | Sidebar lien actif |

---

## 2. Typographie

- **Police** : `Plus Jakarta Sans` (fallback : system fonts)
- **Taille de base** : `14px` (html)
- **Line-height** : `1.6` (body)
- **Antialiasing** : activé

### Échelle typographique

| Classe | Taille | Graisse | Line-height | Usage |
|--------|--------|---------|-------------|-------|
| `h1` | `1.714rem` (24px) | 700 | 1.3 | Titre de page |
| `h2` | `1.429rem` (20px) | 600 | 1.4 | Sous-titre, modal header |
| `h3` | `1.143rem` (16px) | 600 | 1.5 | Titre de carte |
| `.body-sm` | `0.929rem` (13px) | — | — | Texte courant petit |
| `.caption` | `0.857rem` (12px) | 500 | — | Labels, métadonnées |
| `.overline` | `0.786rem` (11px) | 600 | — | Section label, uppercase |

### Couleurs texte

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#243B53` | Texte principal |
| `--text-secondary` | `#627D98` | Texte secondaire |
| `--text-tertiary` | `#9FB3C8` | Placeholders, flèches |
| `--text-inverse` | `#FFFFFF` | Texte sur fond sombre |
| `--text-sidebar` | `#D9E2EC` | Liens sidebar |
| `--text-sidebar-muted` | `#9FB3C8` | Sidebar rôle, label |

---

## 3. Espacements

| Token | Valeur | Usage |
|-------|--------|-------|
| `--space-xs` | `4px` | Gap minimal, padding badge |
| `--space-sm` | `8px` | Gap boutons, padding input |
| `--space-md` | `16px` | Padding standard, gap grille |
| `--space-lg` | `24px` | Padding carte, gap sections |
| `--space-xl` | `32px` | Padding header, margin sections |
| `--space-2xl` | `48px` | Padding login card, upload zone |

---

## 4. Rayons de bordure

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius-sm` | `6px` | Badge |
| `--radius-md` | `8px` | Input, bouton, lien sidebar |
| `--radius-lg` | `12px` | Carte, stat icon, upload zone |
| `--radius-xl` | `16px` | Modal, login card |
| `--radius-full` | `50%` | Avatar, timeline dot |

---

## 5. Ombres

| Token | Valeur | Usage |
|-------|--------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Carte repos, bouton Google |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.1)` | Carte survol |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.12)` | Modal, login card |

---

## 6. Bordures

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-light` | `#E2E8F0` | Carte, séparateurs, tables |
| `--border-medium` | `#D9E2EC` | Input bordure, upload zone |

---

## 7. Transitions

| Token | Valeur | Usage |
|-------|--------|-------|
| `--transition-fast` | `150ms ease` | Hover bouton, liens |
| `--transition-base` | `200ms ease` | Carte, sidebar, modal |
| `--transition-slow` | `300ms ease` | Progress bar, slideUp |

---

## 8. Layout

| Token | Valeur |
|-------|--------|
| `--sidebar-width` | `260px` |
| `--sidebar-collapsed` | `64px` |
| `--header-height` | `64px` |
| Contenu max-width | `1200px` |

### Grilles

| Classe | Colonnes | Gap |
|--------|----------|-----|
| `.grid-2` | 2 | `--space-lg` |
| `.grid-3` | 3 | `--space-lg` |
| `.grid-4` | 4 | `--space-md` |

---

## 9. Composants

### Boutons

| Classe | Fond | Texte | Hover |
|--------|------|-------|-------|
| `.btn-primary` | `primary-700` | blanc | `primary-800` |
| `.btn-secondary` | transparent + bordure `primary-200` | `primary-700` | `primary-50` |
| `.btn-accent` | `accent-main` | blanc | `accent-dark` |
| `.btn-ghost` | transparent | `primary-600` | `primary-50` |
| `.btn-danger` | `error` | blanc | `#9B2C2C` |

- Taille standard : `padding 8px 16px`, `font-size 0.929rem`
- Taille large (`.btn-lg`) : `padding 16px 24px`, `font-size 1rem`
- Icônes : `18×18`, `stroke-width 1.75`

### Badges par phase

| Phase | Fond | Texte |
|-------|------|-------|
| Prospect | `#F5F0FF` | `#6B46C1` |
| Début | `info-bg` | `#2B6CB0` |
| Analyse | `warning-bg` | `#975A16` |
| Intégration | `success-bg` | `#276749` |
| Bilan final | `#FAF5FF` | `#6B46C1` |

### Badges de statut

| Statut | Fond | Texte |
|--------|------|-------|
| Actif | `success-bg` | `success` |
| Inactif | `#FFF5F5` | `#C53030` |
| Complété | `#F0FFF4` | `#276749` |

### Avatars (règles métier)

| État | Initiales | Fond |
|------|-----------|------|
| Client actif | blanc | `accent-main` |
| Client inactif | blanc | `primary-200` |
| Prospect | `#6B46C1` | `#E8D8FE` |

### Cartes

- Fond : `bg-card` blanc
- Bordure : `1px solid border-light`
- Rayon : `radius-lg` (12px)
- Padding : `space-lg` (24px)
- Ombre repos : `shadow-sm` → survol : `shadow-md`
- Carte cliquable : `translateY(-2px)` au survol

### Modal

- Overlay : `rgba(16, 42, 67, 0.6)` — bleu marine semi-transparent
- Rayon : `radius-xl` (16px)
- Max-width : `520px`
- Animation : `scaleIn` (scale 0.95 → 1)

### Inputs

- Bordure : `border-medium`
- Focus : bordure `primary-300` + halo `rgba(95, 126, 179, 0.12)`
- Placeholder : `text-tertiary`

---

## 10. Animations

| Nom | Effet | Usage |
|-----|-------|-------|
| `fadeIn` | Opacité 0 → 1 | Modal overlay |
| `scaleIn` | Scale 0.95 → 1 + fade | Modal |
| `slideUp` | TranslateY 8px → 0 + fade | `.animate-in` |
| `shimmer` | Dégradé horizontal animé | Skeleton loader |
| `spin` | Rotation 360° | Loader circulaire |
| `pulse` | Scale 1 → 1.05 + halo rouge | Alerte urgente |

---

## 11. Responsive

| Breakpoint | Adaptations |
|------------|-------------|
| `≤ 1024px` | Grilles 3/4 colonnes → 2 colonnes |
| `≤ 768px` | Sidebar masquée (toggle burger), grilles → 1 colonne, padding réduit, header vertical |

---

## 12. Page de Login (Landing commerciale)

- Fond : gradient `#1A2332 → #0F1923 → #162133`
- Disposition : 2 colonnes (commercial + login), max-width `1280px`
- Couleur accent : `#DAA520` (or plus chaud que l'app)
- Cercles décoratifs : `rgba(218,165,32, 0.03–0.06)`
- Bouton Google : fond blanc, ombre, hover translateY(-1px)
- Bouton CTA principal : gradient `#DAA520 → #F6AD55`
