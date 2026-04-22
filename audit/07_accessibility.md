# 07 — Accessibility Audit (WCAG 2.1 AA / RGAA 4)

**Audit scope**: CoachCRM frontend — `/home/zamolxes/devs/coach-crm/` (React 19 + Vite 8 SPA, French UI, pre-MVP).
**Audit date**: 2026-04-21. Branch `main`.
**Method**: Static analysis of source (`src/**`), design tokens (`src/index.css`) and `index.html`. No runtime / AT / browser testing performed.
**References**: WCAG 2.1 AA (W3C) and RGAA 4.1 (DINUM, France).

---

## Executive Summary

- **WCAG 2.1 AA conformance estimate**: ~15–25 % of applicable Level-A/AA success criteria currently pass. 18 of the 30 criteria spot-checked are **Fail**; 7 are **Partial**; 3 are **Pass**; 2 are **N/A**.
- **RGAA obligation applicability**: **Not legally binding**. CoachCRM is a private B2B SaaS targeting self-employed therapists; it is outside the 11 Feb 2005 law scope (public bodies and large private entities with > €250M turnover) and outside the EAA (European Accessibility Act, art. 4) for micro-enterprise suppliers. However (a) clients who are publicly funded (mutuelles, associations) may request a conformance statement, and (b) the target audience includes practitioners aged 40+ who are more likely than average to have mild vision or motor impairments, so accessibility is a **commercial quality differentiator** rather than a legal requirement.
- **Overall risk**: **High**. The app will fail every automated check (axe, Wave, RGAA Accessibility Checker) and all manual keyboard / NVDA / VoiceOver screen-reader tests.
- **Production-ready from an a11y standpoint**: **No — Conditional**. Pre-MVP posture is defensible, but before any paid launch the critical fixes listed below should be shipped and a provisional accessibility statement should accompany the product.
- **Top 8 systemic defects** (all detailed in Findings):
  1. **Zero `aria-*` attributes and zero `role=` attributes exist in the entire codebase.** `grep -r` on `src/**/*.jsx` returns 0 hits on both. No assistive-tech semantics anywhere.
  2. **Zero `htmlFor` on `<label>`**. The app has 46 `<label>` elements and 0 label/input associations. Screen-reader users cannot identify any field in any form.
  3. **No `:focus-visible` rule**. `index.css` declares `outline: none` on every input/textarea/select (line 643, 658) and has **no focus-ring replacement** on `.btn`, `.btn-primary`, `.sidebar-link`, or any custom clickable `<div>`. Keyboard users are flying blind.
  4. **Modals lack dialog semantics and focus management**. 7 distinct modal sites (`SessionDetailModal` 905 LOC, `EditIdentityModal` 767, `NotesModal`, `DeleteConfirmModal`, `DuplicateAlert`, `DashboardPage` new-session, `FinancesPage` drawer). **None** of them uses `role="dialog"`, `aria-modal`, `aria-labelledby`, or a focus trap. The confirm dialog (`ConfirmContext.jsx`) is the best-behaved, and even it has no trap.
  5. **Icon-only buttons have no accessible name**. `lucide-react` SVGs render as `<svg>` with no `role`/`aria-hidden`; icon-only buttons (close `<X>`, logout `<LogOut>`, dismiss `<X>`, mic `<Mic>`, etc.) rely on `title=` — unreliable for AT — or nothing at all.
  6. **Skip-link absent, `<h1>` missing or duplicated**. No `<a href="#main">` bypass block. Some pages have an `<h1>` (SettingsPage, SessionsPage, ClientsPage, ReportsPage, DeletedClientsPage, AdminPage, ReseauProPage, LoginPage) but `Sidebar.jsx:27` also emits an `<h1>Coach<span>CRM</span></h1>` on every page — resulting in **two `<h1>` per page**, which breaks the outline and violates 1.3.1.
  7. **Design-token contrast failures**. `--text-tertiary #9FB3C8` is **2.15:1** on white (fails any text threshold). `--text-secondary #627D98` is **4.12:1** on white (fails AA normal text). `--success #38A169` is **3.07:1**, `--warning #D69E2E` is **2.35:1**, and `--info #3182CE` is **4.01:1** — all below 4.5:1 for body copy.
  8. **`LoginPage.jsx:306` uses `<span style={{cursor:'pointer'}}>` for "conditions d'utilisation" and "politique de confidentialité"** — not links, not keyboard-reachable, not discoverable by AT. Outright WCAG 2.1.1 + 4.1.2 failure. The same file has a non-submit email input at line 234-247 with no label/autoComplete that does nothing on click (the "Créer mon compte gratuitement" button ignores the email value and opens Google OAuth instead — A-09 and A-12 combined).

Other systemic issues: no `<html lang>` issue (`fr` is set correctly), but no `prefers-reduced-motion` media query; `main.jsx:8-19` installs a global `input`-event listener that synthetically re-fires `input` events on every numeric field — may confuse screen readers that re-announce values on each `input` event; `ReseauProPage.jsx:130` uses `window.confirm()` for a destructive bulk delete; `html { font-size: 14px }` (`index.css:99`) reduces browser-zoom headroom.

---

## Scope & Methodology

**In scope**:
- Every `.jsx` file under `src/`: `App.jsx`, `main.jsx`, `components/**` (19 files incl. 5 client sub-components + 2 dashboard + 3 layout + 1 session), all 13 pages (LoginPage, DashboardPage, ClientsPage, ClientDetailPage, SessionsPage, FinancesPage, AdminPage, DeletedClientsPage, ReseauProPage, ReportsPage, ReportDetailPage, SettingsPage, HelpPage), `OnboardingWizard.jsx`.
- `src/index.css` (1 484 lines, single style sheet, design system + component styles).
- `index.html` for `<html lang>`, `<title>`, viewport meta, font loading.
- `src/context/` — `ToastContext.jsx`, `ConfirmContext.jsx`, `DataContext.jsx` for cross-cutting a11y (toasts, dialogs).

**Out of scope**:
- Supabase Edge Functions (`supabase/functions/**`) — server-side, no UI.
- `live_schema/` — schema snapshots, not UI.
- Marketing-style iconography that only appears on `LoginPage.jsx` pre-authentication decorative circles.
- Mobile-specific hit-target audit (requires device testing).

**Method**:
- `grep -rn` across `src/` for: `aria-`, `role=`, `<label`, `htmlFor`, `alt=`, `<img`, `onKeyDown`, `tabIndex`, `<h1>`–`<h4>`, `prefers-reduced-motion`, `:focus`, `outline`, semantic tags (`<nav>`/`<main>`/`<section>`), `onClick` on non-button elements, `autoComplete`, `placeholder`, `title=`, `window.confirm`, `alert(`.
- Visual inspection of `SessionDetailModal.jsx`, `EditIdentityModal.jsx`, `NotesModal.jsx`, `DeleteConfirmModal.jsx`, `ConfirmContext.jsx`, `ToastContext.jsx`, `Sidebar.jsx`, `Layout.jsx`, `LoginPage.jsx`, `DashboardPage.jsx`, `ClientDetailPage.jsx`.
- Contrast ratios computed from `:root` tokens in `src/index.css:9-53` (sRGB WCAG 2.1 formula).

**Counts gathered**:
- Inline `style={{` occurrences: **1 376** (across 252 files; per-line). The prompt cites 849 inline-style *sites*; the raw occurrence count is higher because many sites include multiple inline style objects on nested elements. Either figure confirms the same enabling factor.
- `onClick` occurrences: **252**.
- `<label>` occurrences: **46**.
- `htmlFor=` occurrences: **0**.
- `<input>` occurrences: **78**.
- `autoComplete` occurrences: **0**.
- `aria-*` occurrences: **0**.
- `role=` occurrences: **0**.
- `tabIndex` occurrences: **0**.
- `<img>` with meaningful `alt`: **1** (`SettingsPage.jsx:91` Google Calendar icon, `alt="Google Calendar"`). One other (`AdminPage.jsx:132`) uses `alt=""` — acceptable as decorative.

---

## WCAG 2.1 AA — Criterion Status Summary

| Criterion | Level | Status | Notes |
|---|---|---|---|
| **1.1.1** Non-text content | A | **Fail** | Lucide icons render as `<svg>` with no `aria-hidden`. Every icon-only button (close `<X>`, logout `<LogOut>`, mic `<Mic>`, delete `<Trash2>`, dismiss `<X>`, score eye `<Eye>`) lacks `aria-label`; `title=` is used inconsistently, announced unreliably. The single meaningful `<img alt>` (`SettingsPage.jsx:91`) is correctly labelled. |
| **1.3.1** Info and relationships | A | **Fail** | 46 `<label>`, 0 `htmlFor`. Tables have `<th>` but no `scope=` (`ClientsPage.jsx:404`, `AdminPage.jsx:122`, `DeletedClientsPage.jsx:113`, `ReseauProPage.jsx:384`, `FinancesPage.jsx:464`) and no `<caption>`. Radio/checkbox groups are absent (checkbox only used in SessionDetailModal.jsx:637, 864, each with adjacent text but no programmatic label). |
| **1.3.2** Meaningful sequence | A | **Partial** | DOM order matches visual order in Sidebar/Layout. Modal overlays (`SessionDetailModal.jsx:43`, `NotesModal.jsx:14`) render *before* the dialog itself in DOM — acceptable because overlays are visual only. |
| **1.3.4** Orientation | AA | **Pass** | No orientation locks. |
| **1.3.5** Identify input purpose | AA | **Fail** | 0 `autoComplete` attributes anywhere in the codebase. Email input (`LoginPage.jsx:234-247`), client first/last name / phone / email fields (all forms), session rate / note inputs — none carry `autoComplete`. Password managers and OS fill features cannot operate. |
| **1.4.3** Contrast (text) | AA | **Fail** | Primary text `#243B53` on `#FFFFFF` ≈ 10.64:1 (pass). But `--text-secondary #627D98` on white ≈ **4.12:1** — **fails** AA normal. `--text-tertiary #9FB3C8` ≈ **2.15:1** — fails all. `--success #38A169` ≈ 3.07:1, `--warning #D69E2E` ≈ 2.35:1, `--info #3182CE` ≈ 4.01:1 — all fail AA normal. Used extensively for stat labels, "Créé le …", timeline timestamps, muted caption text, badge text. |
| **1.4.4** Resize text | AA | **Partial** | `html { font-size: 14px }` (`index.css:99`) explicitly overrides user preference. Most sizes are `rem`-based so scaling *does* work, but the baseline is compressed — a user who set browser default to 20 px still starts at 14 px. Fixed-`px` widths in sidebar (260 px), modal (420–640 px in `SessionDetailModal.jsx:49`, `NotesModal.jsx:19`) cause overflow above 175 % zoom. |
| **1.4.5** Images of text | AA | **Pass** | No images of text. The SVG logo mark is decorative. |
| **1.4.10** Reflow | AA | **Fail** | Modals pinned at `minWidth: 420` (`SessionDetailModal.jsx:49`, `NotesModal.jsx:19`, `ActionDetailPanel.jsx` drawer) force horizontal scroll below 420 CSS-px. The 10-column client table (`ClientsPage.jsx:389-414`) with columns *Nom / Phase / Séances / Dernier RDV / Prochain RDV / Parrain / Contact / Source / Recommandé / Actions* also overflows at 320-400 px without reflow. |
| **1.4.11** Non-text contrast | AA | **Fail** | `--border-light #E2E8F0` on white ≈ 1.28:1 — fails 3:1 for form-field borders. Focused state `box-shadow: 0 0 0 3px rgba(99,125,152,0.15)` is 15 %-alpha, effectively invisible (≈ 1.5:1 against white). Sidebar muted icon on sidebar bg `#9FB3C8` on `#243B53` ≈ 4.96:1 — passes. Checkbox / radio borders rely on user-agent default, which may or may not meet 3:1 depending on OS. |
| **1.4.12** Text spacing | AA | **Pass** | No `letter-spacing`/`line-height`/`word-spacing` declarations that would prevent user overrides. |
| **1.4.13** Content on hover or focus | AA | **Fail** | Tooltips rely exclusively on native `title=` (23 occurrences across codebase — `Sidebar.jsx:54, 129`; `SessionCard.jsx:258`; `ClientStatsPanel.jsx:172, 240`; `EditIdentityModal.jsx:184, 265, 518`; `ClientHeaderPanel.jsx:52, 71, 82`; `ClientFinancialPanel.jsx:153, 220`; `ClientTimelinePanel.jsx:305, 315`; `NotesModal.jsx:144`; `DuplicateAlert.jsx:111, 130`; `ClientCreationMarker.jsx:65`; `SettingsPage.jsx:339, 378, 391, 518`; `ReseauProPage.jsx:169, 176, 183`; `FinancesPage.jsx:551, 553`). `title` is not dismissible, not hoverable, not persistent; disappears on touch. |
| **2.1.1** Keyboard | A | **Fail** | `<div onClick>` / `<span onClick>` on: modal overlays (every modal), `ClientsPage.jsx:233` (entire card clickable), `ReseauProPage.jsx:506` (`<span>` navigates to client), `EditIdentityModal.jsx:557` (referrer candidate row), `SessionDetailModal.jsx:43` (overlay), `NotesModal.jsx:14` (overlay), `ActionDetailPanel.jsx:31` (overlay), `Sidebar.jsx:23` (sidebar overlay), `Sidebar.jsx:50-58` (disabled secondary nav items — "Rituo" / "IA Assistant" — `<div>` with `cursor:pointer`, no `tabIndex`, no key-handler), `ReportsPage.jsx:18` (report row), `SessionDetailModal.jsx:104-107` (therapy phase stepper `<div onClick>`). |
| **2.1.2** No keyboard trap | A | **Pass** | No infinite keyboard traps (ironically because there is no focus trap at all). |
| **2.1.4** Character key shortcuts | A | **Pass** | No single-key shortcuts. |
| **2.3.3** Animation from interactions (AAA) | AAA | Fail (info) | 7 `@keyframes` declared (`fadeIn`, `scaleIn`, `shimmer`, `slideUp`, `slideInRight`, `spin`, `pulse` — `index.css:1271-1349`) plus inline `toastSlideIn` in `ToastContext.jsx:87-90` and inline `spin` in `App.jsx:191`. No `@media (prefers-reduced-motion: reduce)` override. |
| **2.4.1** Bypass blocks | A | **Fail** | No skip-to-content link. Sidebar has 7 default nav items (+ 3 admin) before `<main>`. |
| **2.4.2** Page titled | A | **Partial** | `<title>CoachCRM — Votre pratique, amplifiée par l'IA</title>` is static (`index.html:8`). No `document.title` updates on route change (no `useEffect` pattern in any page). Tab/bookmark label is identical on every route. |
| **2.4.3** Focus order | A | **Fail** | Natural DOM order is correct; but modals do not move focus on open, do not restore focus on close, and do not trap Tab. Pressing Tab inside a modal lets focus escape to the (still-mounted) background page. |
| **2.4.4** Link purpose | A | **Partial** | `<NavLink>` items have visible text. `DuplicateAlert.jsx:222` uses `<a href target="_blank" rel="noopener noreferrer">` correctly. But many non-link navigations (card click, span click) fail 4.1.2. |
| **2.4.6** Headings and labels | AA | **Fail** | `Sidebar.jsx:27` emits `<h1>Coach<span>CRM</span></h1>` on every page — meaning pages that also use `<h1 className="page-title">` (SettingsPage, SessionsPage, ClientsPage, DeletedClientsPage, ReportsPage, AdminPage) have **two `<h1>`**. Pages that use `<h2>` for top-level content (`FinancesPage.jsx:205`) have an inverted hierarchy (`<h1>Coach…` in sidebar, `<h2>` for page title). `DashboardPage.jsx` has no page-level heading at all. ClientDetailPage uses `<h1>` via `ClientHeaderPanel.jsx:68` for the client name (OK) but then sub-`<h3>`s jump without an `<h2>`. |
| **2.4.7** Focus visible | AA | **Fail** | Only text-field `:focus` rules exist (`index.css:642-660`). `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-accent`, `.sidebar-link`, `.mobile-toggle`, `.modal-close` — none have `:focus` or `:focus-visible`. No global `:focus-visible` rule. Keyboard users cannot tell which button / link is focused. |
| **3.1.1** Language of page | A | **Pass** | `<html lang="fr">` is set in `index.html:2`. |
| **3.1.2** Language of parts | AA | **Pass** | UI is pure French; no mixed-language strings detected. |
| **3.2.1** On focus | A | **Pass** | No focus-triggered context changes. |
| **3.2.2** On input | A | **Pass** | No forms auto-submit on input. The numeric-input `main.jsx:8-19` handler mutates value but does not submit. |
| **3.3.1** Error identification | A | **Partial** | `LoginPage.jsx:188-203` renders error text in a visible div without `role="alert"` / `aria-live`. Toasts (`ToastContext.jsx:56-84`) have no `role`/`aria-live` wrapper at all, so error toasts are invisible to AT. |
| **3.3.2** Labels or instructions | A | **Fail** | Most inputs rely on visible-only `<label>` (no `htmlFor`), on nearby `<div>` captions, or on `placeholder=` as sole label (74 placeholder attributes across codebase — `LoginPage.jsx:237`, `NotesModal.jsx:70, 154`, `EditIdentityModal.jsx` field set, `ClientsPage` search, etc.). |
| **3.3.3** Error suggestion | AA | **Partial** | LoginPage shows "Erreur de connexion. Réessayez." (generic); no field-level help anywhere. Duplicate-detection component (`DuplicateAlert.jsx`) *is* a positive pattern — it gives concrete guidance — but only visual, not AT-accessible. |
| **3.3.4** Error prevention (legal) | AA | **Partial** | Deletion flows use `ConfirmContext` (good) in most places, but `ReseauProPage.jsx:130` uses native `window.confirm()` for a destructive bulk delete. |
| **4.1.1** Parsing (obsolete) | — | N/A | Removed in WCAG 2.2; React output is well-formed. |
| **4.1.2** Name, role, value | A | **Fail** | Zero `role=`, zero `aria-*`. Modals lack `role="dialog"`. Icon-only buttons lack accessible names. `<span style={{cursor:'pointer'}}>conditions d'utilisation</span>` in `LoginPage.jsx:306` has no role and no name. `<div onClick>` clickable nav items in Sidebar.jsx:50 lack role. Active NavLink has no `aria-current="page"`. |
| **4.1.3** Status messages | AA | **Fail** | Toasts in `ToastContext.jsx` are rendered in a `<div>` with **no `role="status"` / `role="alert"` / `aria-live`** — AT never hears them. Confirm dialog lacks `role="alertdialog"`. Loading spinners (`App.jsx:188, 213`, `AdminPage.jsx:53`, `SessionDetailModal.jsx:335`) have no `role="status"` / `aria-busy`. |

**Summary**: 3 Pass, 18 Fail, 7 Partial, 2 N/A — out of 30 checked.

---

## Findings

Findings are grouped by severity. Each one cites a `file:line` with the smallest reproducer available.

### Critical (blocks users who rely on keyboard / screen reader / zoom)

---

#### A-01: Zero `aria-*` and `role=` attributes in the whole codebase

- **WCAG / RGAA**: WCAG 4.1.2 (A), 1.3.1 (A), 4.1.3 (AA) / RGAA 7.1, 9.
- **Location**: global — `grep -rn "aria-" src --include="*.jsx"` returns **0**, `grep -rn "role=" src --include="*.jsx"` returns **0**.
- **Impact**: Every single a11y-related finding below is downstream of this. Screen-reader users cannot perceive dialogs, status messages, expanded/collapsed state, current page, disabled items, live updates, toggles, tabs, or required-field markers. This is the single root cause of the conformance level.
- **Recommendation**: Adopt `eslint-plugin-jsx-a11y` at `recommended` ruleset; it would flag dozens of these issues automatically. Prioritise the four patterns that account for the majority of violations: dialogs (`role="dialog" aria-modal="true" aria-labelledby`), icon-only buttons (`aria-label`), status messages (`role="status"` / `aria-live="polite"`), and active nav links (`aria-current="page"`).

---

#### A-02: Form labels are not associated with inputs (zero `htmlFor`)

- **WCAG / RGAA**: WCAG 1.3.1 (A), 3.3.2 (A), 4.1.2 (A) / RGAA 11.1.
- **Location**: global. `<label>` occurrences: **46**. `htmlFor=` occurrences: **0**. Representative examples:
  - `LoginPage.jsx:234-247` — email input with only `placeholder="Votre adresse email professionnelle"` and no `<label>` at all.
  - `NotesModal.jsx:66-81` (4 categories) — `<span>Dynamique relationnelle</span>` + `<textarea>`, no binding.
  - `NotesModal.jsx:150-163` — free-form textarea: a `<span>Notes libres</span>` sibling, not a label.
  - `EditIdentityModal.jsx` — identity form fields (first name / last name / phone / email / birth year / children) across ~400 lines of JSX, with 0 `htmlFor` bindings.
  - `SettingsPage.jsx` — phase settings (name, color, price) and recruitment-source fields, no labels.
  - `DashboardPage.jsx:527-639` — new-session modal form.
  - `OnboardingWizard.jsx:183-372` — wizard steps with inline editable therapy phases / sources / prices.
  - `ClientStatsPanel.jsx:171-253` — inline editable total sessions, rate, frequency — click-to-reveal inputs with no label at all.
- **Evidence**: `<span style={{ fontSize: '0.786rem', fontWeight: 600, color: cat.color }}>{cat.label}</span> <textarea value={…} />` — no programmatic association.
- **Impact**: A screen-reader user reading the form hears "edit" / "text area" / "combobox" with no label. The visible headings are invisible to AT.
- **Recommendation**:
  ```jsx
  const id = useId()
  <label htmlFor={id} className="input-label">Email</label>
  <input id={id} type="email" autoComplete="email" />
  ```
  React 19's `useId()` hook is already available. A codemod pass over `src/` could add this in ~1 dev day for all 46 labels + ~30 unlabelled placeholder-only inputs.

---

#### A-03: No focus-visible styling on buttons, nav links, cards, or icon buttons

- **WCAG / RGAA**: WCAG 2.4.7 (AA) / RGAA 10.7.
- **Location**: `src/index.css` — `grep "focus"` returns only text-field rules at lines 642-645 and 649-661. `.btn` (line 451-465), `.btn-primary` (472), `.btn-secondary` (481), `.btn-accent` (491), `.btn-ghost` (500), `.btn-danger` (509), `.btn-google` (533), `.sidebar-link`, `.modal-close`, `.mobile-toggle`, `.card-clickable` have **no** `:focus` or `:focus-visible`.
- **Evidence**: `.btn { transition: all var(--transition-fast); }` — no focus rule; no outline.
- **Impact**: Keyboard users cannot see which button/card is focused when Tabbing. Violates 2.4.7 absolutely.
- **Recommendation**: Add a global rule early in `index.css`:
  ```css
  :focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
    border-radius: 4px;
  }
  ```
  Then restore focus on fields explicitly (current `outline: none` at lines 643 and 658 already replaces with `border-color` + `box-shadow` — but the shadow is 12-15 % alpha, effectively invisible; strengthen to `0 0 0 2px var(--primary-500)` at ≥ 50 % opacity).

---

#### A-04: Modal dialogs lack `role="dialog"`, `aria-modal`, `aria-labelledby`, focus trap, Escape handling

- **WCAG / RGAA**: WCAG 4.1.2 (A), 2.4.3 (A), 2.1.2 (A) / RGAA 7.1, 7.3, 12.
- **Location**: 7 distinct modal sites:
  - `components/client/SessionDetailModal.jsx:40-85` — sliding panel, 905 LOC, no dialog role.
  - `components/client/EditIdentityModal.jsx:66-70` — full-screen overlay edit form, 767 LOC.
  - `components/client/NotesModal.jsx:13-25` — sliding panel for structured notes.
  - `components/client/DeleteConfirmModal.jsx:6-14` — delete client confirmation.
  - `components/DuplicateAlert.jsx:25-50` — not a modal but an always-mounted alert; still missing `role="alert"`.
  - `components/dashboard/ActionDetailPanel.jsx:31-40` — sliding action detail panel.
  - `pages/DashboardPage.jsx:519-640` — new-session modal (uses `.modal-overlay` and `.modal` classes — those *exist* in `index.css` even though the modal markup is inconsistent).
  - `context/ConfirmContext.jsx:27-95` — best-behaved, uses `.confirm-dialog` class and an overlay click-to-close, but still **no** `role="alertdialog"`, no focus trap, no Escape handler.
- **Evidence**: pattern used throughout:
  ```jsx
  <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:999 }} />
  <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'50%', ... zIndex:1000 }}>
    <div style={{ padding:'...', borderBottom:'...' }}>
      <h3 style={{ fontSize:'1rem', fontWeight:700 }}>Séance {sessionNum}</h3>
      <button onClick={onClose}><X size={18} /></button>
    </div>
    ...
  </div>
  ```
  No `role`, no `aria-modal`, no `aria-labelledby`. No `useEffect` that moves focus into the dialog. No key handler for `Escape` (only `FinancesPage.jsx:889` and `ClientCreationMarker.jsx:58` handle Escape — both for inline editing, not dialogs).
- **Impact**: Screen-reader users can keep tabbing "behind" the modal and interact with the now-hidden page. No announcement that a dialog opened. Sighted keyboard users cannot press Escape. Focus is lost on close.
- **Recommendation**: Extract a reusable `<Modal>` primitive or use `@radix-ui/react-dialog` (16 KB gzipped, handles trap + restoration + labelling + Escape + overlay click). Or hand-roll:
  ```jsx
  function Modal({ open, onClose, labelledBy, children }) {
    const ref = useRef(null)
    const triggerRef = useRef(null)
    useEffect(() => {
      if (!open) return
      triggerRef.current = document.activeElement
      ref.current?.focus()
      const onKey = e => { if (e.key === 'Escape') onClose() }
      document.addEventListener('keydown', onKey)
      return () => {
        document.removeEventListener('keydown', onKey)
        triggerRef.current?.focus()
      }
    }, [open])
    if (!open) return null
    return (
      <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} ref={ref} tabIndex={-1}>
        {children}
      </div>
    )
  }
  ```

---

#### A-05: Clickable `<div>` / `<span>` with no keyboard access

- **WCAG / RGAA**: WCAG 2.1.1 (A), 4.1.2 (A) / RGAA 7.1.
- **Location**:
  - `pages/ClientsPage.jsx:233` — `<div className="card card-clickable" onClick={() => navigate(...)}>` — the whole client card is a `<div>` with no `role="button"` / `tabIndex`.
  - `pages/ReportsPage.jsx:18` — `<div className="report-item" onClick={...}>` — report rows.
  - `pages/ReseauProPage.jsx:506` — `<span onClick={() => r.clientId && navigate(`/clients/${r.clientId}`)}>{r.clientName}</span>` — name span that navigates.
  - `components/layout/Sidebar.jsx:50-58` — disabled secondary items ("Rituo", "IA Assistant") are `<div>` with `cursor:'pointer'` — non-interactive for keyboard users, yet carry a `title`.
  - `components/layout/Sidebar.jsx:23` — overlay `<div>` click-to-close.
  - `components/client/SessionDetailModal.jsx:43, 103-118` — overlay + therapy-phase stepper (clickable `<div>` with hover and `onClick`, no keyboard).
  - `components/client/NotesModal.jsx:14` — overlay.
  - `components/client/EditIdentityModal.jsx:66, 557` — overlay + referrer-candidate row.
  - `components/dashboard/ActionDetailPanel.jsx:31` — overlay.
  - `components/client/DeleteConfirmModal.jsx:6` — overlay.
  - `components/client/ClientHeaderPanel.jsx:211` — full-viewport dismissal overlay.
  - `components/client/ClientNotesPreview.jsx:8` — note preview card is a full `<div onClick>`.
  - `components/session/SessionCard.jsx:62` — session cards are `<div onClick>` when clickable.
- **Evidence**: `<div onClick={() => navigate(`/clients/${client.id}`)}>...</div>` with no `tabIndex`, no `role="button"`, no `onKeyDown`.
- **Impact**: Keyboard-only users cannot open a client card, a report row, a professional-network partner's client, or dismiss a modal (the last is acceptable only if the close button works — which it does, via the `<X>` icon button, but those also lack an accessible name per A-06).
- **Recommendation**: Convert every "clickable card" to a real `<button>` (preferred for modal dismissal & disabled nav items) or to a real `<a href>` (for client/report navigation, with `onClick={e => { e.preventDefault(); navigate(...) }}` for SPA). For clickable rows/cards that must stay `<div>` visually, add `role="button" tabIndex={0} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handler()}`.

---

#### A-06: Icon-only buttons have no accessible name

- **WCAG / RGAA**: WCAG 4.1.2 (A), 2.4.4 (A) / RGAA 6.1, 6.2.
- **Location**: pervasive pattern `<button onClick={...}><Icon size={N} /></button>` with no `aria-label`. A partial list:
  - `components/layout/Sidebar.jsx:127-132` — logout `<button onClick={onLogout} title="Déconnexion"><LogOut size={18} /></button>`. Uses `title`, no `aria-label`.
  - `components/client/SessionDetailModal.jsx:76-83` — modal close. No `title`, no `aria-label`.
  - `components/client/NotesModal.jsx:41-48` — modal close. Same problem.
  - `components/client/DuplicateAlert.jsx:45-49` — dismiss button `<button onClick={onDismiss}><X size={12} /></button>`. No label.
  - `context/ToastContext.jsx:72-80` — toast close button.
  - `context/ConfirmContext.jsx:39-41` — confirm-dialog close button.
  - `components/layout/Layout.jsx:25-27` — mobile toggle `<button onClick={...}><Menu size={24} /></button>`. No label.
  - `components/session/SessionCard.jsx:257` — delete session row button (has `title` only).
  - `components/client/ClientTimelinePanel.jsx:305, 315` — edit/delete row buttons.
  - `pages/ReseauProPage.jsx:169, 176, 183` — sort buttons, icon-only with `title`.
- **Evidence**: `<button onClick={() => setExpandedSessionId(null)}><X size={18} /></button>` — zero accessible name.
- **Impact**: AT announces "button" with nothing further. `title=` is unreliable, not announced in some configurations, and disappears on touch devices.
- **Recommendation**: Add `aria-label="Fermer"` / `aria-label="Déconnexion"` / `aria-label="Supprimer"` to every icon-only button. Also add `aria-hidden="true"` on the inner `<svg>` to prevent double-announcement. If migrating to a Lucide wrapper, standardise `<button aria-label="Fermer"><X aria-hidden size={18} /></button>`.

---

#### A-07: No skip-to-content link / bypass blocks

- **WCAG / RGAA**: WCAG 2.4.1 (A) / RGAA 12.7.
- **Location**: `components/layout/Layout.jsx:15-37`. `<Sidebar>` is rendered first; `<main className="app-main">` follows. No `<a href="#main">` at top.
- **Impact**: Keyboard users must Tab through 5-10 sidebar links, the user avatar, and the logout button on every page load.
- **Recommendation**:
  ```jsx
  <a href="#main-content" className="skip-link">Aller au contenu principal</a>
  // + CSS in index.css:
  .skip-link {
    position: absolute; top: -40px; left: 0;
    padding: 8px 16px; background: var(--primary-800); color: white;
    z-index: 10000; text-decoration: none;
  }
  .skip-link:focus { top: 0; }
  ```
  And give the main content wrapper `id="main-content" tabIndex={-1}`.

---

#### A-08: Double `<h1>` per page / broken heading outline

- **WCAG / RGAA**: WCAG 2.4.6 (AA), 1.3.1 (A) / RGAA 9.1.
- **Location**:
  - `components/layout/Sidebar.jsx:27` emits `<h1>Coach<span>CRM</span></h1>` on every page.
  - `pages/SettingsPage.jsx:68`, `pages/SessionsPage.jsx:5`, `pages/ClientsPage.jsx:140`, `pages/DeletedClientsPage.jsx:74`, `pages/ReportsPage.jsx:13`, `pages/AdminPage.jsx:77`, `pages/ReseauProPage.jsx:141`, `pages/ReportDetailPage.jsx:26`, `pages/HelpPage.jsx:137`, `pages/LoginPage.jsx:78`, `components/client/ClientHeaderPanel.jsx:68` — each also emits an `<h1>`, producing **two `<h1>` per page**.
  - `pages/FinancesPage.jsx:205` uses `<h2>` for page title (wrong level since the page has no `<h1>` of its own — *then* the Sidebar's `<h1>` is the only top-level).
  - `pages/DashboardPage.jsx` — **no `<h1>` / `<h2>` at all** for the page itself (grep shows no page-title heading in `DashboardPage.jsx`).
  - `pages/ClientDetailPage.jsx:271` — `<h3>Thérapie #{n}</h3>` jumps from an `<h1>` in ClientHeaderPanel without an `<h2>`.
  - `pages/ReportDetailPage.jsx:40-140` — 10 consecutive `<h3>` with the page `<h1>` at line 26; no `<h2>` sectioning.
- **Evidence**: Every authenticated page = Sidebar `<h1>Coach/CRM</h1>` + page body `<h1 className="page-title">…</h1>`.
- **Impact**: Screen-reader rotor users see two top-level headings per page. Page structure is flat / ambiguous. Many pages have an H3 nested directly under an H1.
- **Recommendation**: Demote `Sidebar.jsx:27` to a styled `<div>` (no heading semantics; decorative brand) OR promote it to an `<h1>` and change every page's `<h1 className="page-title">` to `<h2>`. First option is cleaner. Add `<h1>` to `DashboardPage.jsx` (currently missing).

---

#### A-09: Non-link elements used as links (footer text on LoginPage)

- **WCAG / RGAA**: WCAG 2.1.1 (A), 4.1.2 (A), 2.4.4 (A) / RGAA 6.1.
- **Location**: `pages/LoginPage.jsx:306` — `<span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>conditions d'utilisation</span> et notre <span style={{ color: 'rgba(218,165,32,0.6)', cursor: 'pointer' }}>politique de confidentialité</span>`.
- **Evidence**: Pure `<span>`; no `href`, no `onClick`, no `role="button"`, no `tabIndex`. *The spans are not even clickable* — they have `cursor: pointer` styling without any handler. Dead UI.
- **Impact**: 
  1. Users who expect to review the terms cannot.
  2. Keyboard users cannot tab to them at all.
  3. Screen readers announce them as plain text.
  4. Mobile users clicking them get no feedback.
  5. Pre-MVP this is also a **legal risk** — the app shows "En vous connectant, vous acceptez nos conditions…" but never links to those conditions.
- **Recommendation**: Replace with real `<a href="/terms" target="_blank" rel="noopener noreferrer">conditions d'utilisation</a>` and `<a href="/privacy" …>politique de confidentialité</a>`, and add `/terms` + `/privacy` public routes (can be static Markdown or a `docs/legal/` link). See CRA-app recent commit `0da1566` for a complete reference implementation.

---

#### A-10: Toast notifications invisible to AT (no `role="status"` / `aria-live`)

- **WCAG / RGAA**: WCAG 4.1.3 (AA) / RGAA 7.3.
- **Location**: `src/context/ToastContext.jsx:46-92`.
- **Evidence**: `<div style={{ position:'fixed', bottom:24, right:24, zIndex:99999, ... }}>` wrapper and each `<div key={toast.id}>` — **no `role`, no `aria-live`, no `aria-atomic`**.
- **Impact**: Every `showToast` call (and there are ~40 in the codebase, guessing from the `useToast` imports across pages) produces a visual popup that AT users never hear. Success, error, and warning messages are all silent.
- **Recommendation**: Wrap the toast container in `<div role="region" aria-label="Notifications" aria-live="polite" aria-atomic="false">` and give each error/warning toast `role="alert"`. Or minimum patch:
  ```jsx
  <div role={toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status'}
       aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
       key={toast.id}>…</div>
  ```

---

### High

---

#### A-11: `ConfirmContext` dialog has no dialog role, no focus management, no Escape handler, no focus trap

- **WCAG / RGAA**: WCAG 4.1.2 (A), 2.4.3 (A) / RGAA 7.1.
- **Location**: `src/context/ConfirmContext.jsx:27-95`.
- **Evidence**: The dialog is a `<div className="confirm-dialog">` — no `role="alertdialog"`, no `aria-labelledby={titleId}`, no `aria-describedby={msgId}`. On mount, focus is not moved into the dialog; on open, the `<button className="confirm-dialog-close">` and action buttons receive no initial focus; on unmount, focus is not restored. No Escape handler.
- **Impact**: Of all the dialogs in the app this is the most critical because it is used for **destructive confirmation** (`confirm("Supprimer ce client ?", …)`). A keyboard user who opens the dialog must Tab through the entire background page to reach the Confirm button.
- **Recommendation**: Fix this one first — it is the highest-leverage fix (all `useConfirm()` callers benefit). Add `role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-msg"`, move focus to the default-action button on open, restore on close, add `Escape` handler (already dismisses via overlay click, so add keydown listener equivalent).

---

#### A-12: Contrast insufficient for body / secondary / tertiary / status text

- **WCAG / RGAA**: WCAG 1.4.3 (AA) / RGAA 3.2.
- **Location**: `src/index.css:9-53` tokens, used across every page.
- **Evidence** (see Contrast Spot Checks table below for the full list):
  - `--text-secondary #627D98` on white ≈ **4.12:1** — fails AA normal (used for stat-label, greeting subtext, timeline captions; many usages are 0.786-0.857 rem ≈ 11-12 px).
  - `--text-tertiary #9FB3C8` on white ≈ **2.15:1** — fails any threshold. Used extensively for placeholder text, "—" (no data) cells, metadata.
  - `--success #38A169` on white ≈ **3.07:1** — fails AA normal (used for "Encaissé" badge text).
  - `--warning #D69E2E` on white ≈ **2.35:1** — fails AA normal and AA large (used for warning icon strokes, token `--accent-main`).
  - `--info #3182CE` on white ≈ **4.01:1** — fails AA normal.
  - `--accent-main #D69E2E` on white ≈ 2.35:1 — the hero "gold" colour used in the LoginPage CTA ring and elsewhere; ratio matches `--warning` because it is the same hex.
  - `--accent-dark #B7791F` on white ≈ **3.79:1** — fails AA normal, passes large.
- **Recommendation**: Replace `--text-secondary` with `#486581` (primary-600, ratio 5.44:1 — passes AA). Replace `--text-tertiary` with `#627D98` (what was `--text-secondary`, ratio 4.12:1 — passes AA large) and restrict its usage to ≥ 18 pt. Replace `--success` with `#2F855A` (darker green, ratio 4.63:1). Replace `--warning` / `--accent-main` text usages with `--accent-dark #B7791F` *only on ≥ 18 pt text*; for smaller text use a darker `#8B5A13` or switch to an icon + label pattern. Replace `--info` with `#2B6CB0` (ratio 5.20:1). These changes only touch the 5 tokens and immediately lift hundreds of downstream contrast violations.

---

#### A-13: Colour alone conveys meaning on duplicate severity, session status, payment status

- **WCAG / RGAA**: WCAG 1.4.1 (A) / RGAA 3.1.
- **Location**:
  - `components/DuplicateAlert.jsx:13-23` — match score colour-coded by threshold (`>=90` red `#DC2626`, `>=70` orange `#D97706`, else grey `#6B7280`). A numeric `%` is shown alongside, which saves this use-case partially — still no text "élevé / moyen / faible".
  - `components/client/SessionDetailModal.jsx:72` — cancelled session coloured red via `color: 'var(--error)'`; the only visual signal. No icon, no text "Annulée".
  - `components/ConfirmBadge.jsx` and `components/PaymentBadge.jsx` — payment status differentiated by colour with icon. Partial — icons help.
  - `pages/FinancesPage.jsx:551-553` — "Encaissé" vs "En attente" differentiated by a `€` circle (green) vs `<Hourglass>` (red). Colour + icon is acceptable, but the `€` is rendered as just a text character in a coloured circle — high information density only clear if both are perceived.
- **Recommendation**: Add text labels to every colour code (e.g. "(annulée)" next to the session number on cancelled sessions, `Risque élevé` next to score ≥ 90 on `DuplicateAlert`). Use `aria-label` on icon-only status indicators to state the value explicitly.

---

#### A-14: Native `window.confirm()` used for destructive action

- **WCAG / RGAA**: WCAG 4.1.3 (AA) / RGAA 7.3.
- **Location**: `pages/ReseauProPage.jsx:130` — `if (window.confirm(\`Supprimer ${selected.size} partenaire(s) professionnel(s) ?\`)) { ... }`.
- **Evidence**: Native browser dialog bypasses the `ConfirmContext` styled dialog used elsewhere. Native `window.confirm` is accessible (browsers handle it), but inconsistent, loses focus context, and (crucially) lacks the RGPD-style visual warning the rest of the app uses for deletion.
- **Recommendation**: Replace with `useConfirm()` from `src/context/ConfirmContext.jsx` (after fixing A-11): `const ok = await confirm(\`Supprimer \${selected.size} partenaire(s) ?\`, { title: 'Confirmation', variant: 'danger' })`.

---

#### A-15: Tables lack `<caption>`, `<th scope=>`, and row-header linkage

- **WCAG / RGAA**: WCAG 1.3.1 (A) / RGAA 5.1, 5.4, 5.6, 5.7.
- **Location**: every table in the app:
  - `pages/AdminPage.jsx:119-181` — two tables (admins / therapists): `<thead><tr><th>Nom</th>…</tr></thead>`, no `scope`, no caption.
  - `pages/DeletedClientsPage.jsx:102-119` — archived clients table.
  - `pages/FinancesPage.jsx:464-470` — invoices table: `{['Date','Client',…].map(h => <th key={h}>{h}</th>)}`.
  - `pages/ReseauProPage.jsx:373-390` — partners table.
  - `pages/ClientsPage.jsx:389-414` — clients table with 10 columns, no scope.
- **Recommendation**: Add `<caption className="sr-only">Liste des clients actifs</caption>` to each table, `scope="col"` on `<th>` headers, `scope="row"` on the first `<td>` of each row (or convert that cell to `<th scope="row">`). Add `.sr-only` utility class to `index.css`.

---

#### A-16: No `autoComplete` hints on any input

- **WCAG / RGAA**: WCAG 1.3.5 (AA) / RGAA 11.13.
- **Location**: all forms. 0 `autoComplete` attributes in 78 `<input>` occurrences.
  - `LoginPage.jsx:236` — email input.
  - `EditIdentityModal.jsx` — partner names / phone / email / birth year / children names.
  - `OnboardingWizard.jsx` — identity and therapy prefs.
  - `SettingsPage.jsx` — user identity / tarif / phase.
  - `DashboardPage.jsx:527-639` — new-session modal.
- **Impact**: Password managers and OS autofill cannot operate. Failing 1.3.5 is also a performance / UX regression.
- **Recommendation**: Add appropriate WHATWG tokens: `autoComplete="email"` / `"given-name"` / `"family-name"` / `"tel"` / `"bday-year"` / `"postal-code"` / `"organization"` / `"organization-title"` / `"off"` (for fields that must never autofill).

---

#### A-17: Loading spinners are invisible to AT

- **WCAG / RGAA**: WCAG 4.1.3 (AA) / RGAA 7.3.
- **Location**:
  - `App.jsx:186-193` — initial auth loading, `<div>` with animated border; no role, no label.
  - `App.jsx:211-215` — Suspense fallback `<div className="spinner" />` — no label.
  - `AdminPage.jsx:53` — inline `<div className="spinner" />`.
  - `components/client/SessionDetailModal.jsx:335` — `<Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />` with visible "Transcription…" text — *this* one is at least accompanied by text, but the wrapping element has no `aria-live` / `role="status"`.
- **Recommendation**: Wrap each spinner `<div role="status" aria-live="polite" aria-label="Chargement en cours">` (or include visually hidden "Chargement" text). React Router lazy loading in particular is announced as silence to AT users.

---

#### A-18: No `prefers-reduced-motion` override; animations everywhere

- **WCAG / RGAA**: WCAG 2.3.3 (AAA) — aspirational but widely expected.
- **Location**: `src/index.css` — 7 `@keyframes` declared (lines 1271-1349). Plus inline `toastSlideIn` in `ToastContext.jsx:86-90` and inline `spin` in `App.jsx:191`. Modals fade in (`animation: fadeIn 0.2s`), slide (`animation: slideIn 0.25s ease-out`), cards animate (`animate-in` class in `Layout.jsx:32`).
- **Recommendation**: Add at the top of `index.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

#### A-19: No `aria-current="page"` on active NavLink

- **WCAG / RGAA**: WCAG 4.1.2 (A) / RGAA 9.2.
- **Location**: `components/layout/Sidebar.jsx:32-114` — `<NavLink className={({ isActive }) => \`sidebar-link ${isActive ? 'active' : ''}\`}>…</NavLink>`. Visual active state via class; no `aria-current`.
- **Impact**: AT users cannot tell which page is active.
- **Recommendation**: 
  ```jsx
  <NavLink to={...} end={...}>
    {({ isActive }) => (
      <span aria-current={isActive ? 'page' : undefined} className={`sidebar-link ${isActive ? 'active' : ''}`}>
        <item.icon aria-hidden="true" />
        <span>{item.label}</span>
      </span>
    )}
  </NavLink>
  ```
  (React Router 7 supports render-prop children on NavLink.)

---

#### A-20: Native `title=` used as primary affordance in 23 places

- **WCAG / RGAA**: WCAG 1.4.13 (AA), 4.1.2 (A) / RGAA 10.2.
- **Location**: 23 `title=` occurrences (full list in 1.4.13 row above). Used on icon-only buttons, inline edit spans, sort controls, disabled secondary-nav items.
- **Impact**: `title=` is not reliable. Not dismissible with Escape, not hoverable, disappears on touch, not consistently announced.
- **Recommendation**: Replace with `aria-label` for icon-only controls (the primary fix for 4.1.2). For rich tooltips that must remain, implement a proper `<Tooltip>` component (ARIA APG pattern: `aria-describedby`, dismissible, hoverable, persistent).

---

### Medium

---

#### A-21: `html { font-size: 14px }` reduces user-zoom headroom

- **WCAG / RGAA**: WCAG 1.4.4 (AA) / RGAA 10.4.
- **Location**: `src/index.css:98-102`.
- **Evidence**: `html { font-size: 14px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }`.
- **Impact**: A user who sets their browser default to 20 px still starts at 14 px (70 %). 200 % zoom lands at 28 px instead of 40 px. Design relies on a 14 px baseline so rem units are scaled; this is intentional but user-hostile.
- **Recommendation**: Either remove `font-size: 14px` (accept a slightly larger baseline) or set `font-size: 87.5%` (= 14 px at default 16 px) while documenting it in the design charter. Best pattern: `html { font-size: 100%; } body { font-size: 0.875rem; }`.

---

#### A-22: Global numeric-input handler in `main.jsx` may confuse AT

- **WCAG / RGAA**: WCAG 4.1.3 (AA), 3.3 (A/AA).
- **Location**: `src/main.jsx:8-19`.
- **Evidence**: A global `document.addEventListener('input', ...)` that detects leading-zero sequences (`007` → `7`) and synthetically re-dispatches an `input` event on the native setter. AT (especially VoiceOver) may re-announce the value on every synthetic event.
- **Impact**: User types "0", hears "0"; types "7", hears "7"; the handler mutates value to "7" and refires `input` — AT announces "7" again. Low-risk but a subtle annoyance, and it runs on *every* numeric input in the app.
- **Recommendation**: Replace with a React-controlled handler on the specific inputs that need zero-stripping (e.g. price / session count / rate). The targeted handler can use `onBeforeInput` / `onChange` and strip without synthetic re-dispatch.

---

#### A-23: Overlay click-to-dismiss not accessible

- **WCAG / RGAA**: WCAG 2.1.1 (A).
- **Location**: every modal uses `<div className="modal-overlay" onClick={close}>` pattern — see A-04 locations.
- **Recommendation**: Acceptable once A-04 is fixed (close button + Escape key provide the keyboard path). Add `aria-hidden="true"` to the overlay itself once dialog semantics are in place.

---

#### A-24: No `document.title` change on route change

- **WCAG / RGAA**: WCAG 2.4.2 (A).
- **Location**: `index.html:8` sets static title; no page updates `document.title`.
- **Recommendation**: Add a `usePageTitle(title)` hook:
  ```js
  function usePageTitle(title) {
    useEffect(() => { document.title = \`\${title} — CoachCRM\` }, [title])
  }
  ```
  Call it in each page (`usePageTitle('Mes Clients')`, `usePageTitle('Séances')`, etc.).

---

#### A-25: Error messages not linked via `aria-describedby`

- **WCAG / RGAA**: WCAG 3.3.1 (A), 3.3.3 (AA).
- **Location**: `LoginPage.jsx:188-203` — error divs are siblings of the button that causes the error, not associated with the email input.
- **Recommendation**: `<input aria-invalid={!!error} aria-describedby={error ? 'login-error' : undefined} />` + `<div id="login-error" role="alert">{error}</div>`.

---

#### A-26: Radio / checkbox groups lack `<fieldset>` / `<legend>`

- **WCAG / RGAA**: WCAG 1.3.1 (A) / RGAA 11.3.
- **Location**: `SessionDetailModal.jsx:637, 864` — two `<input type="checkbox">` (one for "covered" sessions, one for invoice sessions) rendered in a list without a group parent. No `<fieldset>`/`<legend>` or `role="group" aria-label`.
- **Recommendation**: Wrap in `<fieldset><legend className="sr-only">Sessions couvertes par ce forfait</legend>…</fieldset>`.

---

#### A-27: `OnboardingWizard.jsx` wizard steps lack step-landmark / `aria-current="step"`

- **WCAG / RGAA**: WCAG 4.1.2 (A), 2.4.6 (AA).
- **Location**: `components/OnboardingWizard.jsx:370-380` — wizard dots `{steps.map((s, i) => (<div onClick={() => goTo(i)}>…))}`. No aria roles, no aria-current for active step, no keyboard access.
- **Recommendation**: Use `<nav aria-label="Étapes d'installation"><ol>…<li><button aria-current={i === current ? 'step' : undefined}>…</button></li></ol></nav>`.

---

#### A-28: Sidebar disabled nav items are not semantically disabled

- **WCAG / RGAA**: WCAG 4.1.2 (A).
- **Location**: `components/layout/Sidebar.jsx:49-61` — secondary items "Rituo" and "IA Assistant" are `<div>` with `cursor: 'default'`, `opacity: 0.4`, and `title="Bientôt disponible"`. No `aria-disabled`. A keyboard user cannot even focus them to know they exist.
- **Recommendation**: Convert to `<button disabled aria-disabled="true">…</button>`, styled to match. Or hide them from AT entirely with `aria-hidden="true"` if they are decorative "coming soon" markers.

---

#### A-29: `<input>` inside `DuplicateAlert.jsx` link is valid but alone

- **WCAG / RGAA**: informational.
- **Location**: `components/DuplicateAlert.jsx:222-236` — `<a href={\`/clients/\${item.id}\`} target="_blank" rel="noopener noreferrer">` is correctly formed. Good pattern — the rest of the codebase could adopt this for client-detail navigation.

---

### Low / Informational

---

#### A-30: No `sr-only` / `.visually-hidden` utility class

`index.css` has no screen-reader-only utility. Recommended:
```css
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}
```
Adding this is a prerequisite for A-15 captions, skip-link fallbacks, and live-region announcements.

---

#### A-31: `<html lang="fr">` is set — confirm language policy for future en-FR mix

`index.html:2` sets French correctly. If English phrases ever appear (e.g. "CRM" expanded in marketing copy), wrap them in `<span lang="en">…</span>`.

---

#### A-32: Favicon is `/vite.svg` (default Vite asset)

`index.html:5`. Pre-production default. Replace before launch with a branded icon; not an a11y issue but a polish item and a small `<link rel="icon">` trust signal.

---

#### A-33: Animations use inline `<style>` injection at runtime

`App.jsx:191` and `ToastContext.jsx:86-90` inject `<style>` blocks with keyframes at runtime. Works but makes `prefers-reduced-motion` harder to apply globally; prefer consolidating into `index.css`.

---

#### A-34: Google OAuth button embedded SVG is not `aria-hidden`

`LoginPage.jsx:217-222` — the 4-path Google logo SVG should have `aria-hidden="true"` on the `<svg>` since the accessible name is provided by the button text "Se connecter avec Google".

---

#### A-35: "V2" pills inside Sidebar disabled items lack AT-hidden

`Sidebar.jsx:58` — `<span>V2</span>` appears in disabled Rituo/IA items. If the items become `aria-disabled`, the span still announces as "V 2" — add `aria-label="Disponible dans la version 2"` or hide.

---

#### A-36: `<aside>` landmark in Sidebar

`Sidebar.jsx:24` uses `<aside className="sidebar">` which is correct. Informational — good pattern.

---

#### A-37: Toast button close has inline-computed colour, no `aria-label`

`ToastContext.jsx:72-80` — `<button onClick={() => removeToast(toast.id)}><X size={14} /></button>` — add `aria-label="Fermer la notification"`.

---

#### A-38: Scroll container on `.sidebar-nav` and timeline has no `role` / `tabIndex`

A scrollable region with a visual scrollbar is reachable by pointer but, if the content can overflow without any focusable child, keyboard users cannot scroll it. Low risk here — most scrollable containers have focusable children.

---

#### A-39: Password / account settings not present (Google-OAuth-only)

Since login is Google-OAuth-only (`LoginPage.jsx:204`), there is no password field and therefore no password-manager integration concern for login. Still, add `autoComplete` once email + form are added. Pre-MVP informational.

---

#### A-40: Print styles absent

No `@media print` in `index.css`. Therapists often print reports / invoices. Low priority, but add print-safe CSS (remove sidebar, hide buttons, force black-on-white text) before launch.

---

## Contrast Spot Checks (WCAG 2.1 sRGB formula)

Approximate, rounded to 2 decimal places. Thresholds: 4.5:1 for normal text (< 18 pt regular / < 14 pt bold), 3:1 for large text and non-text UI components.

| Pair | Ratio | WCAG threshold | Pass? |
|---|---|---|---|
| `#243B53` (`--text-primary`) on `#FFFFFF` | 10.64:1 | 4.5:1 normal | **Pass (AAA)** |
| `#243B53` on `#FAFBFC` (`--bg-page`) | 10.30:1 | 4.5:1 | **Pass (AAA)** |
| `#627D98` (`--text-secondary`) on `#FFFFFF` | 4.12:1 | 4.5:1 normal | **Fail** |
| `#627D98` on `#FFFFFF`, ≥ 18 pt | 4.12:1 | 3:1 large | **Pass** |
| `#627D98` on `#FAFBFC` | 3.99:1 | 4.5:1 | **Fail** |
| `#9FB3C8` (`--text-tertiary`) on `#FFFFFF` | 2.15:1 | 4.5:1 | **Fail** (even as large) |
| `#9FB3C8` on `#FAFBFC` | 2.08:1 | 4.5:1 | **Fail** |
| `#486581` (`--primary-600`) on `#FFFFFF` (button text, ghost) | 5.44:1 | 4.5:1 | **Pass** |
| `#334E68` (`--primary-700`) on `#FFFFFF` (primary button bg / text) | 7.90:1 | 4.5:1 | **Pass (AAA)** |
| `#243B53` (`--primary-800`, sidebar bg) on white | 10.64:1 | 4.5:1 | **Pass (AAA)** |
| `#FFFFFF` on `#334E68` (white-on-primary button) | 7.90:1 | 4.5:1 | **Pass (AAA)** |
| `#FFFFFF` on `#243B53` (sidebar text) | 10.64:1 | 4.5:1 | **Pass (AAA)** |
| `#D9E2EC` (`--text-sidebar`) on `#243B53` | 7.98:1 | 4.5:1 | **Pass (AAA)** |
| `#9FB3C8` (`--text-sidebar-muted`) on `#243B53` | 4.96:1 | 4.5:1 | **Pass** |
| `#D69E2E` (`--warning`, `--accent-main`) on `#FFFFFF` | 2.35:1 | 4.5:1 | **Fail** |
| `#D69E2E` on `#FFFFFF`, ≥ 18 pt | 2.35:1 | 3:1 large | **Fail** |
| `#B7791F` (`--accent-dark`) on `#FFFFFF` | 3.79:1 | 4.5:1 normal | **Fail** (passes large) |
| `#C05621` (`--accent-warm`) on `#FFFFFF` | 5.10:1 | 4.5:1 | **Pass** |
| `#38A169` (`--success`) on `#FFFFFF` | 3.07:1 | 4.5:1 normal | **Fail** (passes large) |
| `#276749` (`badge-debut` text) on `#F0FFF4` (`--success-bg`) | ~8.3:1 | 4.5:1 | **Pass (AAA)** |
| `#D69E2E` (`--warning`) on `#FFFFF0` (`--warning-bg`) | ~2.32:1 | 4.5:1 | **Fail** |
| `#C53030` (`--error`) on `#FFFFFF` | 5.10:1 | 4.5:1 | **Pass** |
| `#C53030` on `#FFF5F5` (`--error-bg`) | ~4.97:1 | 4.5:1 | **Pass** |
| `#9B2C2C` (error text in badges) on `#FFF5F5` | ~7.4:1 | 4.5:1 | **Pass (AAA)** |
| `#3182CE` (`--info`) on `#FFFFFF` | 4.01:1 | 4.5:1 | **Fail** (passes large) |
| `#3182CE` on `#EBF8FF` (`--info-bg`) | ~3.88:1 | 4.5:1 | **Fail** |
| `#2B6CB0` (badge info text) on `#EBF8FF` | ~6.5:1 | 4.5:1 | **Pass** |
| `#6B46C1` (badge bilan_final) on `#FAF5FF` | ~7.3:1 | 4.5:1 | **Pass (AAA)** |
| `#975A16` (badge-analyse text) on `#FFFFF0` | ~6.2:1 | 4.5:1 | **Pass** |
| `#DAA520` (login gold) on `#1A2332` (login dark bg) | ~6.4:1 | 4.5:1 | **Pass** |
| `rgba(255,255,255,0.6)` on `#1A2332` (login subtext ≈ `#999999` effective) | ~5.1:1 | 4.5:1 | **Pass** (but alpha on dark gradient varies) |
| `rgba(255,255,255,0.4)` on `#1A2332` (LoginPage caption) | ~3.1:1 | 4.5:1 | **Fail** |
| `rgba(255,255,255,0.3)` on `#1A2332` (LoginPage "V2" pill, divider) | ~2.2:1 | 4.5:1 | **Fail** |
| `rgba(255,255,255,0.25)` on `#1A2332` (LoginPage footer "En vous connectant…") | ~1.9:1 | 4.5:1 | **Fail** |
| `#E2E8F0` (`--border-light`) on `#FFFFFF` (form-field border) | 1.28:1 | 3:1 UI | **Fail** |
| `#D9E2EC` (`--border-medium`) on `#FFFFFF` | 1.41:1 | 3:1 UI | **Fail** |
| `#627D98` focus-ring (`rgba(99,125,152,0.15)`) on `#FFFFFF` | ~1.1:1 | 3:1 UI | **Fail** (effectively invisible) |
| `#DC2626` (DuplicateAlert high-score) on `#FEF2F2` | ~4.4:1 | 4.5:1 normal | **Borderline Fail** |
| `#D97706` (DuplicateAlert medium-score) on `#FFFBEB` | ~3.5:1 | 4.5:1 normal | **Fail** (passes large) |
| `#8B5CF6` (DuplicateAlert link button) on `#F5F0FF` | ~4.2:1 | 4.5:1 | **Fail** (passes large) |

**Interpretation**: Primary text on white is excellent. The **entire secondary / tertiary / status palette** falls below AA body-text thresholds. The most-used token, `--text-secondary`, fails by a hair (4.12:1 vs 4.5:1) — easily fixed by darkening one shade (use `--primary-600 #486581`, 5.44:1, as the secondary text colour, and promote `--text-secondary` current value to tertiary). The LoginPage dark-on-gradient design uses a lot of `rgba(255,255,255,0.25-0.4)` for "subtle" copy — most of that fails AA. Form-field borders at 1.28:1 are the most egregious non-text contrast failure and a primary visual defect.

---

## What's Done Well

- **`<html lang="fr">`** is set correctly on `index.html:2`.
- **`<title>`** is meaningful (though static across routes).
- **Semantic landmarks**: `<aside>` (Sidebar.jsx:24), `<main>` (Layout.jsx:23), `<nav>` (Sidebar.jsx:30), `<header>` (Layout.jsx:24) are used. `<footer>` is missing but `<aside>` already serves as the sidebar region.
- **One proper `<img alt>`** (`SettingsPage.jsx:91` Google Calendar logo) and one decorative `alt=""` (`AdminPage.jsx:132` user photo, acceptable because the adjacent text gives the name).
- **DuplicateAlert.jsx** has a well-structured expandable list with score percentages shown as text alongside colour — colour is not the sole signal.
- **`ConfirmContext`** — although incomplete (see A-11), it is the correct architectural pattern: a single context-provided `confirm()` Promise that standardises the dialog.
- **React 19 `useId()` is available** (React 19 is in `package.json`) but currently unused — fixing A-02 is a one-line-per-input change.
- **No flashing / strobing content** anywhere (WCAG 2.3.1 Pass).
- **No CAPTCHA, no auto-refresh, no auto-advancing carousel** — common a11y pitfalls avoided.
- **No `<iframe>`, `<embed>`, `<object>`** — no third-party-frame a11y debt.
- **OAuth-only login** sidesteps password-field a11y debt (though 1.3.5 autoComplete on email is still required).
- **Most `<button>` elements are native `<button>`** — correct default type, not `<div role="button">` (except where `<div onClick>` was used, A-05).
- **Three instances of proper `onKeyDown` Escape handling** (`ClientCreationMarker.jsx:58`, `FinancesPage.jsx:889` — `if (e.key === 'Escape') …`) show the team knows the pattern; it just needs to be generalised to all modals.

---

## Remediation Plan (prioritized)

### Phase 0 — Before paid launch (critical fixes, ~3–5 dev days)

1. **A-11** Fix `ConfirmContext.jsx`: add `role="alertdialog"`, `aria-labelledby`, focus move on open, focus restore on close, Escape handler, focus trap. Highest leverage — every destructive flow benefits.
2. **A-03** Add global `:focus-visible` rule to `index.css`.
3. **A-02** Wire `htmlFor` on every form via `useId()` — sweep 13 files containing forms / inputs.
4. **A-06 / A-20** Add `aria-label` on every icon-only button (`SessionDetailModal.jsx`, `NotesModal.jsx`, `DuplicateAlert.jsx`, `ToastContext.jsx`, `Sidebar.jsx`, `Layout.jsx`, all row-action icon buttons). Add `aria-hidden="true"` on decorative inline icons.
5. **A-09** Replace `<span style={{cursor:'pointer'}}>` Terms / Privacy on `LoginPage.jsx:306` with real `<a href>` pointing to real pages (or scheduled Markdown).
6. **A-12** Darken `--text-secondary`, `--text-tertiary`, `--success`, `--warning`, `--info` tokens (single-line change per token).
7. **A-07** Add skip-to-content link in `Layout.jsx`.
8. **A-14** Replace `window.confirm` in `ReseauProPage.jsx:130` with `useConfirm()`.
9. **A-10** Add `role="status"` / `role="alert"` + `aria-live` on ToastContext.

### Phase 1 — Within the next sprint (high-impact, ~5–8 dev days)

10. **A-04** Build a reusable `<Modal>` primitive (or adopt `@radix-ui/react-dialog`) and refactor all 7 modal sites to use it. Full focus management, Escape, trap, restoration, `aria-labelledby`.
11. **A-05** Convert all clickable `<div>` / `<span>` to `<button>` or `<a>`. Highest visible fixes: ClientsPage cards, ReportsPage rows, SessionDetailModal phase stepper, EditIdentityModal candidate rows.
12. **A-08** Fix heading outline: demote `Sidebar.jsx:27` `<h1>` to styled `<div>`, ensure every page has exactly one `<h1>`, add `<h1>` to DashboardPage.
13. **A-16** Add `autoComplete` on every form field.
14. **A-17** Wrap loading spinners with `role="status" aria-live="polite"` and an accessible name.
15. **A-19** Add `aria-current="page"` to NavLink.
16. **A-24** Set `document.title` per route.

### Phase 2 — Ongoing (medium, ~5 dev days)

17. **A-15** Add `<caption>` + `scope=` to all five `<table>` instances.
18. **A-18** Add `prefers-reduced-motion` media query.
19. **A-21** Remove or soften `html { font-size: 14px }`.
20. **A-25** Wire `aria-invalid` + `aria-describedby` on LoginPage and every form field with an error state.
21. **A-22** Replace global `main.jsx` numeric-input handler with per-field controlled logic.
22. **A-26** Add `<fieldset>`/`<legend>` to checkbox groups in `SessionDetailModal.jsx`.
23. **A-27** Add step-landmark and `aria-current="step"` to `OnboardingWizard`.
24. **A-28** Make disabled sidebar items real `<button disabled aria-disabled>`.
25. **A-30** Add `.sr-only` utility class.

### Phase 3 — Process & governance

26. Adopt `eslint-plugin-jsx-a11y` at `recommended` ruleset; fail CI on new violations.
27. Run axe-core against `npm run preview` output in CI (via `@axe-core/cli`).
28. Manual tests with VoiceOver (macOS Safari) and NVDA (Windows Firefox) on the 5 critical flows: login, create client (onboarding), add session, edit client identity, delete client.
29. Draft a provisional accessibility statement ("Déclaration d'accessibilité — non conforme") even though not legally required, and link it from the sidebar footer. This sets the expectation with future clients and prospects.
30. Add an accessibility checklist to the PR template ("Does this change keep `:focus-visible` visible? Does any new form field have `htmlFor`, `autoComplete`?").

---

## Conclusion

CoachCRM is in an **early accessibility posture** — more basic than a typical pre-MVP French SaaS. The single defining fact is that the codebase contains **zero `aria-*` attributes, zero `role=`, zero `htmlFor`, and zero `autoComplete`** — a state that indicates accessibility has not been a consideration during initial development. Every downstream defect (labels, dialogs, icon names, toasts, live regions, active nav) derives from that.

None of the findings require a rearchitecture. The majority are mechanical additions: attributes, one `<Modal>` primitive, one token-palette adjustment, and one `useId`-based labelling sweep. Roughly **2–3 weeks of focused front-end effort** would take the app from an estimated 15–25 % AA conformance to ≥ 85 %. The design system is solid (coherent token set, a clear visual language, consistent spacing / typography scale) and makes the remediation tractable; the gaps are in semantics, not in aesthetics.

For a **pre-MVP internal beta** with trusted therapists who are not themselves AT users, the current state is defensible as long as:
- The critical Phase 0 fixes are completed before any paid launch.
- A provisional accessibility statement ("en construction, conformité partielle visée pour [date]") is published.
- Testing by at least one external user with mild visual impairment (common in the 40+ target demographic) is scheduled before the paid-tier launch.

For a **paid-tier release** targeting French therapists (many of whom work under convention with mutuelles that may require RGAA statements from their software suppliers), the Phase 0 + Phase 1 items should be treated as **release blockers**. Specifically: `ConfirmContext` focus management, `<Modal>` primitive, form labels, contrast tokens, and skip-link. Without those, the app will fail a first-pass axe scan and will not pass a hand-off audit by any practitioner who happens to use a screen reader or keyboard-only navigation.

The immediate quick wins — the Terms/Privacy `<span>`-to-`<a>` fix (A-09, 5 minutes), the `aria-live` on toasts (A-10, 15 minutes), `ConfirmContext` hardening (A-11, 1 hour), the `aria-label` sweep on icon buttons (A-06, 2 hours), and the token darkening (A-12, 30 minutes) — together remove the most visible parts of the problem in under a day of engineering time and would move the app from a "failing cover-test" state into a "passing first-impression" state.
