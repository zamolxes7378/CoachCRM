# Phase 1 smoke runbook

This runbook lets the testing team validate that the 13 closed Phase 1 tracks are
working end-to-end on a staging environment before Phase 1 is declared
"operationally done." Pick a test, satisfy its preconditions, execute the steps in
order, and record PASS/FAIL in the results table at the end of this document.

Source: `audit/PHASE1_PLAN.md` §5, cross-referenced with `audit/phase1_verification.md`.

---

## Environment preconditions

All tests require the following to be in place before you begin.

| Item | Value / action |
|------|----------------|
| `VITE_SUPABASE_URL` | Staging Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Staging anon key |
| `VITE_SENTRY_DSN` | Staging Sentry project DSN (required for Test 1) |
| `VITE_APP_URL` | Staging origin used for OAuth `redirectTo` (e.g. `https://staging.coachcrm.app`) |
| `VITE_GOOGLE_WORKSPACE_DOMAIN` | Google Workspace domain if `hd=` lock is configured |
| Migrations applied | All migrations up to and including `20260422103300_audio_bucket.sql` |
| `pg_cron` extension | Enabled via Supabase Dashboard → Database → Extensions |
| `pgsodium` / vault | Enabled via Supabase Dashboard → Database → Extensions |
| Supabase MFA | Enabled at project level (Authentication → MFA settings) |
| Staging admin account | An account with `role = 'admin'` in the `users` table; **no** TOTP factor enrolled before Test 2 |
| Test client | At least one client with ≥ 2 sessions and one report; needed for Tests 3 and 5 |
| Browser | Chrome or Firefox, DevTools available |
| SQL editor | Supabase Dashboard → SQL editor (or `psql` with service-role credentials) |

> Run tests in a dedicated staging project. Never run erasure (Test 7) against
> production data.

---

## Smoke 1 — Sentry + audit wiring (P1-N)

**What it validates:** A forced runtime error is captured by Sentry with correct
user and route metadata; `reportError()` in `src/lib/errorReporter.js` routes to
Sentry in non-DEV mode.

**Preconditions:**
- `VITE_SENTRY_DSN` set to a **staging** Sentry project (not production).
- App built and deployed with `NODE_ENV=production` (or `VITE_DEV=false`); the
  `reportError` wrapper only calls Sentry when `import.meta.env.DEV` is falsy.
- You have access to the Sentry project dashboard.
- Signed in as any allowlisted user.

**Run:**
1. Open the staging app in a browser tab.
2. Open DevTools Console.
3. Paste and execute:
   ```js
   import('/src/lib/errorReporter.js').then(m =>
     m.reportError(new Error('smoke-test-P1N'), { route: '/dashboard', test: true })
   )
   ```
   _(Alternatively, trigger a known error path: navigate to a client detail page
   for a non-existent UUID to provoke a fetch error that calls `reportError`.)_
4. Wait 10–30 seconds.
5. Open the Sentry project dashboard → Issues.

**Expected:**
- A new issue appears in Sentry with message `smoke-test-P1N` (or the fetch error
  message).
- The issue shows the authenticated user's email or ID under "User".
- The issue shows the current URL / route under "URL" or "Request".
- PII fields (notes, narrative, etc.) are **absent** from the Sentry extras — the
  `maskObject` function in `errorReporter.js` redacts them.

**Evidence query** — confirm `audit_log` write-path works (separate from Sentry):
```sql
SELECT action, entity, entity_id, user_id, created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 5;
```

**PASS criteria:**
- Sentry issue received with user + route metadata within 60 seconds.
- No PII in Sentry extras (spot-check `notes`, `email`, `narrative` keys).

**FAIL indicators:**
- No issue appears → `VITE_SENTRY_DSN` missing or app running in DEV mode.
- Issue appears but user is null → Sentry `setUser` call not wired (⚠️ verify on
  staging whether `src/lib/sentry.js` calls `Sentry.setUser` on auth state change).
- PII visible in extras → `maskPII` regex in `errorReporter.js` has a gap.

**Known deviations:** None. Sentry EU-region confirmation is a P2 follow-up
(RoPA row 11).

---

## Smoke 2 — Admin page TOTP gate (P1-O)

**What it validates:** An admin user who has not completed TOTP enrollment cannot
access protected admin functionality; `getAssuranceLevel()` in `src/lib/mfa.js`
returns `aal1` and the enrollment panel is displayed instead.

**Preconditions:**
- Staging admin account exists (`role = 'admin'`) with **no** TOTP factor enrolled.
  Verify: `SELECT id, email FROM auth.users` + `supabase.auth.mfa.listFactors()`
  returns an empty `totp` array.
- Supabase MFA enabled at project level.

**Run:**
1. Sign in as the admin account.
2. Navigate to `/admin`.
3. Observe the page render.
4. If the enrollment panel is shown, click **"Configurer le double facteur"**
   (`src/pages/AdminPage.jsx`, `TotpEnrollPanel`, step `start`).
5. Scan the displayed QR code with Google Authenticator or Authy.
6. Enter the 6-digit code in the **"Code à 6 chiffres"** field and submit.
7. Confirm the success state shows the green "Authentification à deux facteurs
   activée !" message.
8. Sign out and sign back in with the same account.
9. Navigate to `/admin` again — this time TOTP challenge should appear.
10. Enter a valid TOTP code to gain `aal2` access.

**Expected:**
- Step 3: TOTP enrollment panel is shown (not the full admin dashboard).
- Step 7: Success message displayed.
- Step 9: Challenge panel shown on re-login (assurance level `aal1` → must
  upgrade to `aal2`).
- Step 10: Admin dashboard visible after correct code entry.

**PASS criteria:**
- `/admin` is inaccessible (enrollment or challenge shown) until `aal2` is
  confirmed.

**FAIL indicators:**
- Admin dashboard renders immediately without TOTP → `getAssuranceLevel()` check
  missing or returning `aal2` unexpectedly.
- QR code does not appear → Supabase MFA not enabled at project level.
- "Code invalide" on correct code → clock skew > 30 s between device and server.

**Known deviations:** None.

---

## Smoke 3 — Export dossier: confirm → watermarked XLSX → audit_log (P1-P)

**What it validates:** Exporting a client dossier requires explicit consent; the
downloaded XLSX has a watermark header; an `audit_log` row is written with
`action = 'export_client_dossier'`.

**Preconditions:**
- Signed in as any allowlisted therapist.
- Test client exists with at least 2 sessions and one report.

**Run:**
1. Navigate to the test client's detail page.
2. Click the export button (look for the download icon / "Exporter" action — ⚠️
   verify exact button label on staging as it depends on the calling page's
   integration with `ExportConfirmModal`).
3. The `ExportConfirmModal` appears with title **"Exporter le dossier [initials]"**
   and a yellow RGPD notice quoting *"Document confidentiel"* and *"Art. 9 RGPD"*.
   (`src/components/ExportConfirmModal.jsx`, line 56–70)
4. Without checking the consent checkbox, confirm the **"Exporter"** button is
   disabled.
5. Check the consent checkbox:
   *"Je confirme que cet export est nécessaire à des fins professionnelles…"*
6. Click **"Exporter"**. (`src/components/ExportConfirmModal.jsx`, line 139)
7. The browser downloads a file named `dossier_[initials]_[YYYY-MM-DD]_[8charhex].xlsx`.
   (`src/lib/xlsxExport.js`, line 143)
8. Open the XLSX. Verify the first row of each sheet reads:
   *"Document confidentiel — Art. 9 RGPD. Usage restreint au professionnel
   destinataire. | [therapist email] | [ISO timestamp]"*
   (`src/lib/xlsxExport.js`, line 44)

**Evidence query:**
```sql
SELECT action, entity, entity_id, user_id, metadata, created_at
FROM audit_log
WHERE action = 'export_client_dossier'
ORDER BY created_at DESC
LIMIT 1;
```

**PASS criteria:**
- Modal displayed; "Exporter" disabled until consent checked.
- XLSX downloaded with correct filename pattern.
- Watermark row present on each sheet.
- `audit_log` row exists with `entity = 'client'`, correct `entity_id` (UUID),
  `action = 'export_client_dossier'`, and `metadata.therapist_email` set.
  (`src/services/exportService.js`, line 22–29)

**FAIL indicators:**
- Modal does not appear → export action not wired to `ExportConfirmModal`.
- Watermark absent → `insertWatermark()` not called or `exceljs` import failed.
- No `audit_log` row → `emitAuditLog()` threw and was swallowed silently.

**Known deviations:**
- Password protection is UI-only. Checking "Protéger par mot de passe" shows the
  field and a note *"la protection par mot de passe n'est pas encore disponible"*,
  but the generated file is **not** encrypted (ExcelJS OSS limitation, P2 item).
  (`src/lib/xlsxExport.js`, line 149–151)

---

## Smoke 4 — Idle timeout forced logout (P1-O)

**What it validates:** After 30 minutes of inactivity the app forces logout; a
2-minute warning modal appears first.

> **Constants** (defined in `src/App.jsx`, lines 235–236):
> `IDLE_TIMEOUT_MS = 30 * 60_000` (30 min), `IDLE_WARNING_MS = 2 * 60_000` (2 min).

**Preconditions:**
- Signed in as any allowlisted user.
- Ability to override JS constants in the browser Console (or redeploy with
  shortened test values — see Rollback notes below).

**Run (short-override method — no redeploy needed):**
1. Sign in and navigate to `/dashboard`.
2. Open DevTools Console. Paste:
   ```js
   // Override to 20 s total, 5 s warning — for testing only
   window.__IDLE_TEST_TIMEOUT = 20_000
   window.__IDLE_TEST_WARNING = 5_000
   ```
   Note: the React component reads module-level constants, so this Console trick
   does not wire automatically. **Preferred approach: redeploy with shortened
   constants** (see Rollback notes).
3. With shortened constants deployed, stay idle (do not move mouse or type).
4. After `IDLE_TIMEOUT_MS - IDLE_WARNING_MS`, the `IdleWarningModal` appears
   showing a countdown.
5. Do nothing. After the remaining `IDLE_WARNING_MS`, the app calls `handleLogout()`
   → `supabase.auth.signOut()` and redirects to `/login`.

**Expected:**
- Warning modal appears at the correct time with a countdown in seconds.
- After countdown reaches 0, user is redirected to `/login`.
- Clicking the "Rester connecté" button (⚠️ verify exact label on staging)
  dismisses the modal and resets the idle timer.

**Evidence query** — confirm sign-out completed:
```sql
-- No direct DB evidence; check browser: after logout, authenticated Supabase
-- requests should return 401. Verify in DevTools Network tab.
```

**PASS criteria:**
- Warning modal fires before logout.
- App redirects to `/login` at the idle deadline.
- "Rester connecté" resets the timer and closes modal.

**FAIL indicators:**
- No modal → `useIdleTimeout` hook not mounted (check `idleActive` guard in
  `AppContent`).
- No redirect → `handleLogout` not calling `supabase.auth.signOut()`.
- Timer fires immediately → module-level constants already overridden by a
  previous dev change.

**Known deviations:** None.

---

## Smoke 5 — AI transparency banner + export gate (P1-S)

**What it validates:** An AI-generated report displays the transparency banner
and cannot be exported or finalised until `reviewed_at` is set.

**Preconditions:**
- A report row exists with `ai_generated = true` and `reviewed_at = null`.
  Create one via SQL if necessary:
  ```sql
  -- Insert a minimal test report
  INSERT INTO reports (client_id, ai_generated, reviewed_at, narrative)
  VALUES ('<client-uuid>', true, null, 'Test AI report');
  ```
- Navigate to that report in the UI (client detail page → reports tab, or
  `/reports` if a standalone reports route exists).

**Run:**
1. Open the AI-generated report in the UI.
2. Observe the banner: it should show
   **"✨ Généré par IA — vérifiez avant utilisation"** with a yellow/amber
   background and a **"Valider"** button.
   (`src/components/AiTransparencyBanner.jsx`, lines 42–58)
3. Attempt to export or publish the report. The `AiReviewGate` wrapper should
   display: **"Ce rapport IA doit être validé par le thérapeute avant toute action."**
   (`src/components/AiReviewGate.jsx`, line 18)
4. Click **"Valider"** in the banner. This should call the `onValidate` handler,
   which sets `reviewed_at` on the report row (⚠️ verify the `onValidate`
   implementation in `ClientDetailPage.jsx` or `ReportsPage.jsx`).
5. After validation, the banner changes to green:
   **"✨ Généré par IA · Validé le [date]"**
   (`src/components/AiTransparencyBanner.jsx`, lines 6–28)
6. Confirm the export/publish action is now accessible.

**Evidence query:**
```sql
SELECT id, ai_generated, reviewed_at
FROM reports
WHERE ai_generated = true
ORDER BY updated_at DESC
LIMIT 5;
```

**PASS criteria:**
- Unvalidated AI report shows amber banner + gate message; export blocked.
- After clicking "Valider", `reviewed_at` is set; green banner shown; export
  accessible.

**FAIL indicators:**
- Banner does not render → `report.ai_generated` flag not set or component not
  rendered in the report view.
- "Valider" click does not update `reviewed_at` → `onValidate` prop not wired.
- Gate allows export before validation → `AiReviewGate` not wrapping the
  export action.

**Known deviations:** None. (The `validated_by_therapist` column name mentioned
in some early plan notes is implemented as `reviewed_at` in the actual schema —
see `src/components/AiTransparencyBanner.jsx`.)

---

## Smoke 6 — DSAR access request: ticket → JSON archive (P1-R)

**What it validates:** An admin can open a DSAR ticket, generate a JSON archive
of the data subject's rows, and the ticket status updates to "Traité".

**Preconditions:**
- Signed in as admin with `aal2` (TOTP verified — see Test 2).
- Route `/admin/dsar` is accessible (wired in `src/App.jsx` — `DsarRequestsPage`
  lazy-imported).
- At least one client row whose `partner_a->>'email'` matches the test subject
  email.

**Run:**
1. Navigate to `/admin/dsar`.
2. Click **"+ Nouvelle demande"**. (`src/pages/admin/DsarRequestsPage.jsx`, line 101)
3. Fill in:
   - **"Email de la personne concernée"**: the test subject's email address.
   - **"Type de demande"**: "Droit d'accès".
   - Notes: optional.
4. Click **"Créer la demande"**. The new ticket appears in the table with status
   **"En attente"** (`status = 'pending'`).
5. Click **"Gérer"** on the new row.
6. In the detail panel, click **"Prendre en charge"** → status becomes "En cours".
7. Click **"📥 Générer l'archive JSON (droit d'accès)"**.
8. The browser downloads a file named
   `dsar_access_[email]_[timestamp].json`.
   (`src/services/dsarService.js`, line 123)
9. Open the JSON file. Verify it contains:
   - `legal_basis: "RGPD Art.15 — Droit d'accès"`
   - `data.clients`, `data.sessions`, `data.reports`, `data.contacts` arrays.
10. Confirm the ticket status in the UI is now **"Traité"**.

**Evidence query:**
```sql
SELECT id, subject_email, request_type, status, raised_at, fulfilled_at
FROM dsar_requests
ORDER BY raised_at DESC
LIMIT 3;
```

**PASS criteria:**
- Ticket created with status `pending` → `in_progress` → `fulfilled`.
- JSON file downloaded with correct `legal_basis` and data arrays.
- `fulfilled_at` timestamp set in `dsar_requests`.

**FAIL indicators:**
- `/admin/dsar` returns 404 → route missing in `App.jsx` (was added in follow-up
  commit `a190134`; confirm migration and route both applied).
- Empty `data.clients` despite matching email → JSONB query format issue in
  `generateAccessZip()` (the `.or()` filter uses `partner_a->>email.ilike`).
- Ticket remains `pending` after archive generation → `updateRequest` call failed.

**Known deviations:**
- DSAR admin route was added in a follow-up commit (`a190134`) after the main
  `7199562` commit; ensure both are deployed.
- SMTP for DSAR notification emails is not yet configured (P2 item); no email is
  sent to the data subject automatically.

---

## Smoke 7 — `clients_with_stats` view latency (P1-W)

**NOT EXECUTABLE — view skipped by P1-W.**

The `clients_with_stats` view exists (migration `20260422102000_clients_with_stats_view.sql`)
but the P1-W track explicitly skipped the CoreDataProvider / ExtendedDataProvider
split. A 10 000-client smoke dataset has not been loaded; the sub-200 ms latency
target cannot be verified without that dataset.

**Substitute test A — dashboard REST request count (browser DevTools):**
1. Sign in and navigate away from `/dashboard`.
2. Open DevTools → Network tab; enable "Preserve log"; clear existing entries.
3. Navigate to `/dashboard`.
4. Filter by `XHR` or `Fetch` and count Supabase REST (`/rest/v1/`) requests
   during the initial render.
5. **Target:** ≤ 2 parallel Supabase fetches on first render.
   (The `DataProvider` in `src/context/DataContext.jsx` batches loads via a
   single `loadData()` call gated by `inflightRef`.)

**Substitute test B — absence of `.find()` in render paths:**

Run locally after cloning the staging branch:
```bash
grep -rn "\.find(" src/pages/DashboardPage.jsx src/components/ \
  | grep -v "// " | grep -v "test" | grep -v ".spec."
```
Expected: zero matches for inline `.find(c => c.id === ...)` patterns.
The `clientById: Map` pattern via `useMemo` (added in `bfbd4fa`) should cover
all client lookups.

**PASS criteria (substitute):**
- ≤ 2 Supabase REST requests on `/dashboard` first render (DevTools).
- `grep` returns 0 hits for `.find(` in render-path files.

**Known deviations:** Full latency test (200 ms at 10 000 clients) is deferred to
Phase 2 when a performance dataset can be seeded.

---

## Execution order

Fastest-signal-first recommended order:

1. **Test 1** — Sentry (quick feedback on error pipeline)
2. **Test 3** — Export (validates audit_log write path and XLSX)
3. **Test 4** — Idle short-override (validates session timeout)
4. **Test 6** — DSAR access ticket (validates RGPD workflow)
5. **Test 5** — AI banner (validates P1-S gate)
6. **Test 2** — MFA fresh-admin (requires unenrolled admin account)
7. **Test 7** — View substitute (DevTools + grep, no backend required)

---

## Results template

Copy and fill in after each test run.

| Test | Date | Tester | Result | Evidence | Notes |
|------|------|--------|--------|----------|-------|
| 1 Sentry (P1-N) | | | PASS / FAIL | Sentry issue URL | |
| 2 MFA gate (P1-O) | | | PASS / FAIL | Screenshot or admin session token | |
| 3 Export XLSX (P1-P) | | | PASS / FAIL | SQL query result + filename | |
| 4 Idle timeout (P1-O) | | | PASS / FAIL | Screen recording or screenshot | |
| 5 AI banner (P1-S) | | | PASS / FAIL | SQL `reviewed_at` before/after | |
| 6 DSAR access (P1-R) | | | PASS / FAIL | `dsar_requests` SQL + JSON filename | |
| 7 View substitute (P1-W) | | | PASS / FAIL | DevTools screenshot + grep output | |

---

## Rollback notes

### Test 4 — idle timeout constants

If you redeploy with shortened `IDLE_TIMEOUT_MS` / `IDLE_WARNING_MS` for
testing, revert before promoting to production:

1. Open `src/App.jsx`, lines 235–236.
2. Restore:
   ```js
   const IDLE_TIMEOUT_MS = 30 * 60_000   // 30 minutes
   const IDLE_WARNING_MS = 2 * 60_000    // warn 2 minutes before logout
   ```
3. Rebuild and redeploy.
4. Confirm the constants are restored by inspecting the built bundle or running
   the substitute Console snippet (it will no longer observe fast logout).

### Test 6 — DSAR erasure (if accidentally triggered)

`triggerErasure()` sets `retention_until = now()` on matching rows; the next
`purge_expired_data()` run will anonymise them. To abort before the next cron
run:
```sql
-- Reset retention_until for a client you accidentally marked
UPDATE clients SET retention_until = NULL WHERE id = '<client-uuid>';
UPDATE sessions SET retention_until = NULL WHERE client_id = '<client-uuid>';
UPDATE reports SET retention_until = NULL WHERE client_id = '<client-uuid>';
UPDATE contacts SET retention_until = NULL WHERE client_id = '<client-uuid>';
```
Then update the `dsar_requests` row status back to `in_progress` if needed.

---

*Runbook produced 2026-04-22. Source commits: P1-N `08506aa`+`1677794`, P1-O
`f5ed705`, P1-P `0d51707`, P1-R `7199562`+`a190134`, P1-S `1de7772`+`dbfe639`,
P1-W `bfbd4fa`. Cross-reference: `audit/PHASE1_PLAN.md` · `audit/phase1_verification.md`.*
