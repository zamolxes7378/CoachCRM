# 02 — Security Audit

> **Target**: CoachCRM (`/home/zamolxes/devs/coach-crm`) — B2B SaaS CRM for French couples-therapists. React 19 + Vite 8 + Supabase (PostgreSQL 17 + Google OAuth). Deployed on Vercel. Holds **Article 9 RGPD** data (mental-health records, session narratives, emotions per partner, vulnerability notes, intimate patterns).
> **Auditor**: Claude (Opus 4.7). Static analysis only — no dynamic testing, no live-DB inspection, no penetration testing.
> **Date**: 2026-04-21. **Branch**: `main`. **Method**: OWASP Top 10 2021/2024 mapping, CWE tagging, line-anchored evidence.

---

## Executive Summary

- **Overall risk**: **Critical** (for a product that stores RGPD Art. 9 health data).
- **Production-ready from a security standpoint**: **No**. The app has defensible RLS for 8 of its ~12 runtime tables, but the perimeter is wide open in four distinct ways, any one of which would be a showstopper on its own.
- The four blocking issues:
  1. **Committed credentials** — `docs/SETUP_GUIDE.md` (tracked in `main`, discoverable on GitHub) contains both the live Supabase URL (`https://ncjdvohafipisjcslrkk.supabase.co`) and the complete anon JWT. The anon key is "public-ish" by design, but committing it precludes rotation without a rebuild and advertises the target to scanners.
  2. **No signup gate** — `src/App.jsx:92-101` auto-provisions any authenticated Google identity as a `therapist` user, so the only barrier between the public internet and the tenant-isolation model is a working Google OAuth session.
  3. **Legacy OAuth flow** — `src/lib/supabase.js:11` pins `flowType: 'implicit'`, which puts the access token in the URL fragment. Deprecated by OAuth WG, vulnerable to referrer/history leakage, and replaced by PKCE since 2021.
  4. **RLS holes on four runtime tables** — `users`, `therapy_cycles`, `invoices`, `invoice_sessions` are used by the app but have **no RLS policy in version control**. Any permissive state (or the legacy `Dev: public access` policies that `dev_rls.sql` drops from six tables but not these four) allows horizontal leakage across tenants.
- The admin console (`src/pages/AdminPage.jsx:14-25`) issues a raw `SELECT id, name, email, role, photo_url, created_at FROM users` with **no server-side authorization**. If a non-admin can read `users`, every therapist's email is enumerable. If no-one can read `users` (RLS without policy), the admin page is broken. The fact that the product currently works implies one of these is silently true in the live DB outside VCS.
- `transfer_data.sql` and `seed.sql` (committed) contain **real personal data**: `anne-chantal.meyer@gmail.com`, `claudia@kotech.ai`, plus fabricated but partially-real seed clients with phone numbers.
- Vercel deployment configures only SPA rewrites (`vercel.json:1-5`). **Zero HTTP security headers** — no CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- Client-side-only role gate on `/admin` (`App.jsx:224-226`). No MFA. No idle timeout. No audit logging. No Sentry / observability.

Severity: 2 Critical, 5 High, 7 Medium, 5 Low = **19 findings**.

See §Remediation for prioritization.

---

## Scope & Methodology

### Files audited (84 tracked files; 100% of `src/`, `supabase/`, `docs/`, config)

- Auth & routing: `src/App.jsx`, `src/lib/supabase.js`, `src/pages/LoginPage.jsx`, `src/components/layout/Layout.jsx`, `src/components/layout/Sidebar.jsx`
- Role gate & admin: `src/pages/AdminPage.jsx`, `src/pages/DeletedClientsPage.jsx`, `src/pages/ReseauProPage.jsx`
- Data access: `src/services/dataService.js`, `src/services/invoiceService.js`, `src/services/allianceService.js`, `src/services/sponsorshipService.js`, `src/services/exportService.js`
- Global state: `src/context/DataContext.jsx`, `src/context/ToastContext.jsx`, `src/context/ConfirmContext.jsx`
- SQL (migrations + patches): `supabase/migration.sql`, `supabase/dev_rls.sql`, `supabase/seed.sql`, `supabase/transfer_data.sql`, `supabase/add_family_type.sql`, `supabase/remove_completed_status.sql`, `supabase/update_roles.sql`
- Infra & build: `vercel.json`, `vite.config.js`, `index.html`, `package.json`, `.gitignore`
- Schema ground-truth: `audit/live_schema/tables.md`, `audit/live_schema/README.md`
- Business rules: `docs/MES_REGLES_METIER.md`, `docs/MON_ARCHITECTURE_DONNEES.md`, `docs/MES_REGLES_TECHNIQUES.md`, `docs/SETUP_GUIDE.md`, `docs/template_consentement_patient.md`

### Method
1. **OWASP Top 10 2021/2024** mapping, with CWE tagging per finding.
2. **Static code analysis** — Grep across `src/` for XSS sinks, redirect sinks, storage sinks, auth-related calls.
3. **RLS reconciliation** — cross-check tables referenced at runtime (`adapters.js` + `services/**.js`) against policies declared in migrations.
4. **Supply-chain triage** — `package.json` dependency review without running `npm audit`. CVEs cited only at general-knowledge level.
5. **Unverifiable facts** (live-DB state, Supabase dashboard config) are tagged `[Unverified — requires live-DB check]`.

### Out of scope
- Penetration testing, fuzzing, dynamic auth probe.
- Supabase Dashboard configuration (Redirect URL allowlist, rate limiting, password policy, email templates).
- Vercel environment-variable inventory (could differ from `.env` fields).
- Network-layer controls (WAF, DDoS).
- Third-party supplier posture (Resend — no email sending in CoachCRM, N/A).

---

## Threat Model

### Assets (by sensitivity)
| Tier | Asset | Location |
|---|---|---|
| **Tier 1 — RGPD Art. 9** | Session narratives (`reports.narrative`), emotions per partner (`reports.emotions_a`, `reports.emotions_b`), vulnerability notes (`reports.vigilance`, `clients.note_vigilance`), relationship patterns, AI-generated synthesis | `reports`, `clients` JSONB columns |
| **Tier 2 — PII** | Therapist identity (`users.name`, `users.email`, `users.photo_url`), client partner identities (`clients.partner_a`, `clients.partner_b`), phone numbers, billing address | `users`, `clients` |
| **Tier 3 — Financial** | Session payment amounts, payment methods, invoice records, session rates | `sessions`, `invoices`, `invoice_sessions`, `settings.session_rates` |
| **Tier 4 — Operational** | Therapy cycles, professional network contacts, sponsorship links | `therapy_cycles`, `professionals`, `client_links` |

### Threat actors
| Actor | Trust | Primary concern |
|---|---|---|
| Unauthenticated internet | Zero | OAuth abuse via open registration (§S-04), credential scanners harvesting anon key |
| Authenticated `therapist` (any Google account) | Low | Horizontal leakage to other tenants if RLS is misconfigured on any table |
| `admin` (single-tenant operational role) | Medium-high | Insider threat, session theft, no audit trail |
| Client-side attacker (malicious extension, shared device) | Medium | Token theft via implicit-flow URL fragment, localStorage exfiltration |
| Supply-chain | External | `exceljs`, `file-saver`, `lucide-react`, Vite plugin ecosystem |

### Trust boundaries
- **Browser → Supabase PostgREST** — Only effective perimeter. Protected by RLS + JWT. If RLS is wrong, everything is wrong.
- **Browser → Google OAuth → Supabase Auth** — `persistSession: true`, `storageKey: 'coachcrm-auth-token'` in localStorage. No httpOnly cookie posture possible with Supabase implicit/PKCE SPA flow.
- **Vercel hosting** — Static SPA. No server-side code. HTTPS by default (good), no server-side guards (bad).
- **No backend service role** — There is no Edge Function, no cron, no server-to-server path. All writes are client-initiated.

---

## Findings

### Severity scale

| Symbol | Label | Meaning |
|---|---|---|
| 🔴 | Critical | Immediate remediation required. Blocks production for RGPD Art. 9 data. |
| 🟠 | High | Remediate before external availability. Exploitable with moderate effort. |
| 🟡 | Medium | Significant weakening of the security posture. Remediate in the next iteration. |
| 🟢 | Low | Best-practice hardening. Informational or defense-in-depth. |

---

### 🔴 Critical

---

#### S-01: Live Supabase URL and full anon JWT committed to Git in `docs/SETUP_GUIDE.md`

- **Location**: `docs/SETUP_GUIDE.md:62-63` (tracked in `main`, pushed to public GitHub per `docs/SETUP_GUIDE.md:15` — `git@github.com:zamolxes7378/CoachCRM.git`)
- **OWASP**: A02:2021 Cryptographic Failures / A07:2021 Identification and Authentication Failures
- **CWE**: CWE-540 (Inclusion of Sensitive Information in Source Code); CWE-798 (Use of Hard-coded Credentials — partial)
- **Risk**:
  - The file contains verbatim:
    ```
    VITE_SUPABASE_URL=https://ncjdvohafipisjcslrkk.supabase.co
    VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...GCg7Foa4HR-NOXDthpRWMYAGxWTuUWfnLUoPDC5qZ9w
    ```
  - While the anon key is "public-ish" (ships in the client bundle), publishing it in docs does four distinct harms:
    1. **Precludes silent rotation**: to change the anon key you'd have to rebuild *and* edit the doc, turning an ops task into a release.
    2. **Advertises the target**: secret-scanners (GitGuardian, TruffleHog, Semgrep) index public repos for Supabase URL patterns. Discovery moves from "attacker must enumerate" to "attacker pulls from a feed".
    3. **Proves the project exists on Supabase**: the URL confirms the backend provider and region (`eu-west-2` per `docs/SETUP_GUIDE.md:78`), narrowing reconnaissance.
    4. **Contradicts the comment on `docs/SETUP_GUIDE.md:66`**: the file itself claims "la `ANON_KEY` est une clé publique … la sécurité est assurée par les RLS policies sur Supabase" — but RLS holes exist (see S-05), so the assumption fails.
  - The key's JWT payload decodes to `role=anon, iat=1774193763, exp=2089769763` — it expires on ~2036-04-12, meaning this key has a **10-year validity window**. Any compromise persists for a decade unless manually rotated.
- **Evidence**:
  - `docs/SETUP_GUIDE.md:62-63` — full JWT committed.
  - `docs/SETUP_GUIDE.md:79` — exposes `db.ncjdvohafipisjcslrkk.supabase.co` as the DB host.
  - `docs/SETUP_GUIDE.md:85` — exposes dashboard URL `https://supabase.com/dashboard/project/ncjdvohafipisjcslrkk` and the account email `claudia@kotech.ai`.
  - `audit/live_schema/README.md:11-21` corroborates.
  - `.env` itself is correctly gitignored (`.gitignore:2`) and not tracked — the leak is **via the doc, not via `.env`**.
- **Recommendation**:
  1. Replace the real values in `docs/SETUP_GUIDE.md` with placeholders and move the live values to a password manager / Vercel env var only.
  2. Remove the leaked secret from git history: `git filter-repo --path docs/SETUP_GUIDE.md --invert-paths` then recommit a sanitized version, or use `git-filter-branch` + force-push (with coordinated notice to all collaborators). GitHub's secret scanning will retain a reference even after force-push — request a history purge.
  3. Rotate the Supabase anon key from the Supabase dashboard → API → **Generate new anon key**, update Vercel env vars, rebuild.
  4. Rotate the Supabase dashboard account (`claudia@kotech.ai`) — it is also disclosed.
  5. Add a pre-commit hook (e.g. `gitleaks`) and enable GitHub's "Push protection" for the repo.
- **Cross-reference**: §01 Setup/Config, §05 GDPR (disclosure of project identity is a minor §32 RGPD technical-and-organisational-measures breach).

---

#### S-02: No signup gate — any Google account auto-provisions a full `therapist` tenant

- **Location**: `src/App.jsx:92-101` inside `syncUser()`:
  ```javascript
  // 2. New user — default to therapist
  const dbUser = await upsertUser({
    id: authUser.id,
    name: meta.full_name || meta.name || authUser.email,
    email: authUser.email,
    role: 'therapist',
    photo_url: meta.avatar_url || meta.picture || null
  })
  ```
- **OWASP**: A04:2021 Insecure Design; A07:2021 Authentication Failures
- **CWE**: CWE-284 (Improper Access Control); CWE-862 (Missing Authorization); CWE-1327 (Binding to an Unrestricted IP Address — metaphor: zero registration gate)
- **Risk**:
  - The only barrier between the public internet and a working CoachCRM tenant is "have a Google account and visit the app URL once". No email verification gate beyond what Google enforces (which means any burner Gmail qualifies), no invite code, no allow-list, no admin approval.
  - Once provisioned, the new `therapist` row lands in `users` with `role='therapist'` and triggers the UI. RLS then determines whether they can see anyone else's data. **If any RLS policy is wrong** (see S-05), this attacker has the same privileges as any legitimate therapist on the affected table.
  - Even without a RLS hole, this means:
    - Unlimited tenant growth — no way to rate-limit or cap free-tier users. The `Gratuit jusqu'à 5 clients` promise in `LoginPage.jsx:177` is not enforced anywhere in code; it's a marketing claim.
    - Harder breach forensics: if an incident occurs, the `users` table is indistinguishable from a legitimate growth pattern.
    - No revenue enforcement, no contract acknowledgement — which matters for the GDPR DPA between CoachCRM and each therapist (who is the data controller).
  - The business-rules doc and the landing page both claim the product is a controlled B2B SaaS. The code is open-registration.
  - `src/App.jsx:68-106` has no domain check, no `hd` parameter on OAuth (Google Workspace domain hint), no post-auth approval step.
- **Evidence**:
  - `src/App.jsx:92-101` — unconditional upsert with `role: 'therapist'`.
  - `src/pages/LoginPage.jsx:11-16` — `signInWithOAuth({provider: 'google', options: {redirectTo: window.location.origin}})` — no `queryParams` filter.
  - `supabase/migration.sql:10` — CHECK constraint only limits role to `('admin', 'therapist')`, nothing else blocks insert.
- **Recommendation**: choose one strategy, depending on the product posture:
  1. **Invite-only** (recommended for Art. 9 data): introduce an `invitations` table with single-use tokens. In `syncUser`, reject (and sign out) any Google account whose email is not in `invitations`. Admin creates invitations from `AdminPage`.
  2. **Admin approval queue**: on first login, insert into `users` with `role='pending'` and `is_active=false`. App shows "Your account is awaiting approval". Admin flips to `therapist` manually.
  3. **Allow-list**: maintain a `allowed_domains` env var (e.g. `gmail.com,kotech.ai`) and reject outside that set. Light-touch.
  4. **Minimum**: add a server-side (Supabase function or Postgres trigger) idempotency check that blocks upsert unless a precondition is met. Never trust the client to pass `role`.
- **Cross-reference**: §04 DB/RLS (this interacts with S-05), §05 GDPR (a therapist must sign a DPA before processing patient data — auto-provisioning bypasses that).

---

### 🟠 High

---

#### S-03: OAuth `flowType: 'implicit'` is deprecated and token-exposing

- **Location**: `src/lib/supabase.js:11`
  ```javascript
  flowType: 'implicit',
  ```
- **OWASP**: A07:2021 Authentication Failures; A02:2021 Cryptographic Failures
- **CWE**: CWE-522 (Insufficiently Protected Credentials); CWE-598 (Use of GET Request Method With Sensitive Query Strings — by analogy, URL fragment)
- **Risk**:
  - Implicit flow was deprecated by the OAuth 2.0 Security Best Current Practice (draft since 2018, RFC 9700 published 2024). It returns the access token in the URL fragment (`#access_token=…`), which:
    - Appears in `window.location.hash` — readable by **any** script loaded in the same document (analytics, ad-blockers behaving badly, browser extensions with `activeTab` permission, error reporters).
    - Can leak via `Referer` header to any third-party resource requested before the fragment is stripped.
    - Is preserved in browser history (`history.pushState` call at `src/App.jsx:114` only fires *after* the token is already exposed; any MutationObserver, any sync React render, any `document.title` update fires first).
    - Is logged by any site-monitoring that captures full URLs (Google Tag Manager, HotJar, New Relic Browser, Datadog RUM).
  - PKCE (proof-key for code exchange) is the modern equivalent — Supabase supports it natively (`flowType: 'pkce'` — default in `@supabase/supabase-js` v2.38+). PKCE returns an opaque code that is exchanged server-side for the token, never putting the token in the URL.
  - In CoachCRM specifically, there are no third-party analytics loaded (good), but the exposure window still exists between Supabase's callback arrival and the `window.history.replaceState` at `src/App.jsx:114`. Any concurrent script execution (React re-renders, devtools extensions) reads the fragment.
- **Evidence**:
  - `src/lib/supabase.js:11` — explicit opt-in to legacy flow.
  - `src/App.jsx:108-116` — acknowledges the hash handling: `if (window.location.hash && (window.location.hash.includes('access_token') || ...))`. The fact that the app explicitly strips the fragment confirms it knows the token is in a risky place.
- **Recommendation**:
  1. Change `flowType: 'implicit'` → `flowType: 'pkce'` in `src/lib/supabase.js`. Supabase SDK handles the PKCE handshake automatically; no other code change needed.
  2. In the Supabase Dashboard → Authentication → URL Configuration, add the production Vercel URL to Redirect URLs if not already there. PKCE requires redirect matching.
  3. Test the full OAuth round-trip in a staging branch before flipping in prod.
- **Cross-reference**: §07 A&A subsection, §03 code-quality review (low-churn change).

---

#### S-04: `/admin` route gated only client-side; no server-side authorization on admin queries

- **Location**: `src/App.jsx:224-226` and `src/pages/AdminPage.jsx:14-25`
- **OWASP**: A01:2021 Broken Access Control
- **CWE**: CWE-602 (Client-Side Enforcement of Server-Side Security); CWE-285 (Improper Authorization)
- **Risk**:
  - Route guard:
    ```jsx
    <Route path="/admin" element={user.role === 'admin' ? <AdminPage /> : <Navigate to="/" />} />
    ```
  - A user with `role='therapist'` is redirected by React Router, but **the AdminPage module is still lazy-loadable** (`src/App.jsx:18`). A local tamper (React DevTools flipping `user.role` in state, or crafting a custom Supabase client call) renders AdminPage and triggers its query.
  - The query (`AdminPage.jsx:14-17`):
    ```javascript
    const { data } = await supabase
      .from('users')
      .select('id, name, email, role, photo_url, created_at')
      .order('created_at', { ascending: false })
    ```
    has **no WHERE clause** and relies entirely on RLS to filter results. Two scenarios:
    - **Scenario A**: `users` has a permissive RLS policy (e.g. "any authenticated user can read"). Then any therapist who reaches AdminPage's code can enumerate every other therapist's email. This is a **tenant-isolation breach**.
    - **Scenario B**: `users` has no policy or a strict policy (own row only). Then AdminPage is broken for admins too and the query returns 0 rows. The fact that the product ships with this page working implies Scenario A is the live state — but this must be verified.
  - The admin's ability to read any user's identity (email + name + photo_url) is not even checked against `user.role` server-side; whatever reads *you* get, *any* authenticated user can get.
- **Evidence**:
  - `audit/live_schema/tables.md:103` confirms `users` has "**none in VCS**" for RLS policies. `dev_rls.sql:14` enables RLS on `users` but declares zero policies. In PostgreSQL, RLS-enabled-with-no-policy = no rows visible.
  - The product still works (admin sees users). Therefore a policy exists in the live DB that is not in version control. Its content is unknown — this is exactly what S-05 warns about.
- **Recommendation**:
  1. Declare an explicit, narrow RLS policy on `users`:
     ```sql
     -- Own row — every authenticated user sees their own profile
     CREATE POLICY users_self_read ON public.users
       FOR SELECT USING (id = auth.uid());

     -- Admin override — admins see all
     CREATE POLICY users_admin_read ON public.users
       FOR SELECT USING (
         EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
       );
     ```
     *Caveat*: the admin policy is recursive (`users` queries `users`). Resolve by using a `SECURITY DEFINER` helper function `is_admin(uid)` or a separate `admin_users` view. See §04 for the resilient pattern.
  2. Commit the resulting policy into `supabase/migration.sql` or a new `supabase/admin_rls.sql` file.
  3. Remove the client-side redirect dependency by making AdminPage gracefully handle empty results (it already does at `AdminPage.jsx:154-157`).
- **Cross-reference**: §04 DB/RLS (S-05), §07 Session (S-13).

---

#### S-05: Runtime tables `users`, `therapy_cycles`, `invoices`, `invoice_sessions` have no RLS policy in VCS

- **Location**:
  - Tables referenced but not covered: `users` (all pages), `therapy_cycles` (`DataContext.jsx:34`, `dataService.js:168`), `invoices` (`invoiceService.js`), `invoice_sessions` (`invoiceService.js:60,102,113,126,134`).
  - RLS declared in `supabase/migration.sql:165-182` and `supabase/dev_rls.sql:14-26` — covers only `clients`, `sessions`, `contacts`, `reports`, `settings`, `professionals`, `client_links`, `professional_referrals`.
- **OWASP**: A01:2021 Broken Access Control
- **CWE**: CWE-284 (Improper Access Control); CWE-359 (Exposure of Private Personal Information)
- **Risk**: four runtime tables are used by the app but **have no RLS policy in version control**. The live DB state is unknown:
  - **`users`** — holds all therapists' emails, names, roles. See S-04 for the dedicated admin-page concern. If a `Dev: public access` style policy survived (`dev_rls.sql:11` drops it for `users` but only if the name matches exactly), every therapist can enumerate every other.
  - **`therapy_cycles`** — tied to clients (`client_id` + `user_id`). Queried at `dataService.js:170` with `.eq('user_id', userId)` client-side filter. **If RLS is off, any therapist can read every cycle** in the whole DB by calling `supabase.from('therapy_cycles').select('*')` without the filter.
  - **`invoices`** — holds financial records with `user_id`. `invoiceService.getInvoices` at `invoiceService.js:17` also relies on client-side `.eq('user_id', userId)`. Same risk.
  - **`invoice_sessions`** — the join table has **no `user_id` column**, so even a hypothetical user-scoped policy would need to traverse the parent `invoice` or `session`. If RLS is off here, **every therapist can enumerate the full session-to-invoice mapping across all tenants** — e.g. pattern-match sessions to invoice dates to infer pricing and cadence of other therapists.
  - **`reports`** — has a policy (`migration.sql:178`) but it's `FOR ALL USING` without a `WITH CHECK` clause. A therapist can INSERT a report with any `client_id` they do not own — the `USING` expression does not restrict writes without an explicit `WITH CHECK` (see §"PostgreSQL Policy Semantics" below). [Unverified — PG semantics for ALL policies reuse USING as WITH CHECK unless overridden; this is likely safe but worth live-DB verification].
- **PostgreSQL Policy Semantics note**: In PostgreSQL, an `ALL` policy with only `USING` and no `WITH CHECK` **does reuse USING for both read filtering and write-row validation**. So `reports` INSERT is likely constrained correctly. The risk in S-05 is *missing policies entirely*, not policy-clause ambiguity.
- **Evidence**:
  - `audit/live_schema/tables.md:25-28` — `therapy_cycles`, `invoices`, `invoice_sessions` flagged as not in migrations.
  - `audit/live_schema/tables.md:103-106` — RLS policy table shows "none in VCS" for 4 tables.
  - `supabase/dev_rls.sql:6-11` — `DROP POLICY IF EXISTS "Dev: public access"` for 6 tables but NOT for `therapy_cycles`, `invoices`, `invoice_sessions`. If those legacy policies ever existed on these tables, they still exist.
  - `src/services/invoiceService.js:111-117` — delete by composite key (invoice_id + session_id) with no user_id check, entirely dependent on RLS.
- **Recommendation**:
  1. **Immediately** query the live DB:
     ```sql
     SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
     SELECT * FROM pg_policies WHERE schemaname = 'public';
     ```
     Export the results and add them as `supabase/current_rls.sql`.
  2. If any of the four tables has `rowsecurity = false`, enable it and add the missing policies:
     ```sql
     ALTER TABLE users ENABLE ROW LEVEL SECURITY;
     ALTER TABLE therapy_cycles ENABLE ROW LEVEL SECURITY;
     ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
     ALTER TABLE invoice_sessions ENABLE ROW LEVEL SECURITY;

     CREATE POLICY therapy_cycles_own ON therapy_cycles FOR ALL USING (user_id = auth.uid());
     CREATE POLICY invoices_own ON invoices FOR ALL USING (user_id = auth.uid());
     CREATE POLICY invoice_sessions_via_parent ON invoice_sessions FOR ALL USING (
       invoice_id IN (SELECT id FROM invoices WHERE user_id = auth.uid())
     );
     ```
  3. For `users`, see S-04's proposed policy.
  4. Establish a CI step that fails if a new table lands in migrations without a matching policy.
- **Cross-reference**: §04 DB/RLS.

---

#### S-06: Real personal data committed to git in `transfer_data.sql` and `seed.sql`

- **Location**:
  - `supabase/transfer_data.sql:19` — `'anne-chantal.meyer@gmail.com'` hard-coded.
  - `supabase/transfer_data.sql:22` — `'claudia@kotech.ai'` hard-coded.
  - `supabase/seed.sql:8` — same `anne-chantal.meyer@gmail.com` plus a real-sounding admin profile.
  - `supabase/seed.sql:11-58` — fake but plausible partner names + phone numbers + emails.
- **OWASP**: A05:2021 Security Misconfiguration
- **CWE**: CWE-540 (Inclusion of Sensitive Information in Source Code); CWE-359 (Exposure of Private Personal Information)
- **Risk**:
  - `anne-chantal.meyer@gmail.com` is a personal Gmail address of (presumably) the product owner or a pilot user. Publishing it in a public GitHub repo constitutes unsolicited disclosure of PII. Under RGPD, personal email is personal data (CNIL guidance + GDPR Recital 30).
  - `claudia@kotech.ai` is the Supabase dashboard account (per `docs/SETUP_GUIDE.md:86`) — its disclosure is a targeting aid for credential-stuffing against the admin panel.
  - The fact that `transfer_data.sql` "moves data from one real user to another" (per `audit/live_schema/tables.md:86`) means this is **production migration scripting**, not dev seed. It should not be in the same directory as ordinary migrations.
  - Seed phone numbers are `06 12 34 56 78` etc — fake, but close enough to real formats that a naive AI scraper training on this repo could learn and replay them in generated content.
- **Evidence**:
  - `supabase/transfer_data.sql:19,22` — raw emails in DO-block.
  - `supabase/seed.sql:8` — `'Anne-Chantal Meyer', 'anne-chantal.meyer@gmail.com', 'admin'`.
  - `audit/live_schema/tables.md:82` corroborates.
- **Recommendation**:
  1. Remove `transfer_data.sql` from the repo. It is a one-shot production script that has already run — no reason to keep it in version control. `git rm supabase/transfer_data.sql` then `git commit` + history purge.
  2. Replace real emails in `seed.sql` with `example.com` addresses (`anne-chantal@example.com`, `admin@example.com`).
  3. Move `seed.sql` to `supabase/seed_dev/` clearly labeled as non-production, or to a private dev branch.
  4. Add `supabase/seed.sql` and `supabase/transfer_*.sql` patterns to `.gitignore` for future writes.
- **Cross-reference**: §05 GDPR (direct breach of RGPD Art. 5.1.c "data minimisation" and Art. 32 security).

---

#### S-07: No HTTP security headers on the Vercel deployment

- **Location**: `vercel.json:1-5`
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```
- **OWASP**: A05:2021 Security Misconfiguration
- **CWE**: CWE-693 (Protection Mechanism Failure); CWE-829 (Inclusion of Functionality from Untrusted Control Sphere)
- **Risk**: the Vercel deployment serves the SPA with Vercel's defaults: HTTPS, automatic compression, but no opinion about security headers. Missing headers:
  - **`Content-Security-Policy`** — Without CSP, any injected `<script>` executes. Given this app loads Google Fonts (`index.html:9-11`) and Wikipedia SVG (`SettingsPage.jsx:90`) from external origins, a nuanced CSP is necessary.
  - **`X-Frame-Options: DENY`** / `frame-ancestors 'none'` — without this, a malicious site can iframe CoachCRM and trick an authenticated user into clicking (clickjacking). Given the admin can delete clients (`dataService.js:70-78`), this is impactful.
  - **`Strict-Transport-Security: max-age=31536000; includeSubDomains`** — prevents HTTPS downgrade on first visit. Without HSTS, a MITM on a café Wi-Fi can strip TLS on the first HTTP request, serve a phishing page, and steal the Google OAuth redirect.
  - **`Referrer-Policy: strict-origin-when-cross-origin`** — without this, when a user clicks the external `mailto:` link (`LoginPage.jsx:289`) or Wikipedia fetch (`SettingsPage.jsx:90`), the full URL (possibly containing a session-scoped path like `/clients/uuid`) is sent as Referer, leaking client UUIDs to third parties.
  - **`X-Content-Type-Options: nosniff`** — browsers may MIME-sniff user-generated content served from Supabase Storage (not presently used, but prudence).
  - **`Permissions-Policy`** — no restriction on microphone/camera. The product is labeled as potentially recording audio (per `docs/template_consentement_patient.md`), but the current code doesn't do it. If microphone access is ever added, it should be opt-in per-route, not ambient.
- **Evidence**:
  - `vercel.json:1-5` — minimal config.
- **Recommendation**: add a `headers` block:
  ```json
  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/(.*)",
        "headers": [
          { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
          { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
          { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://ncjdvohafipisjcslrkk.supabase.co https://*.supabase.co https://accounts.google.com; img-src 'self' data: https: blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" }
        ]
      }
    ]
  }
  ```
  - Note the CSP allows `'unsafe-inline'` for styles — required because the codebase uses extensive inline `style={{...}}` props (592 occurrences across 20 files, per grep). This is a pragmatic compromise; tighten later by moving to CSS classes.
  - Vite-generated JS is bundled (no inline scripts); `script-src 'self'` should suffice after removing `'unsafe-inline'` from `script-src`. Test after deploy.
- **Cross-reference**: §06 infra/Vercel.

---

### 🟡 Medium

---

#### S-08: OAuth `redirectTo` uses `window.location.origin` — fragile against origin-based attacks

- **Location**: `src/pages/LoginPage.jsx:14`
  ```javascript
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  ```
- **OWASP**: A01:2021 Broken Access Control (Open Redirect variant)
- **CWE**: CWE-601 (URL Redirection to Untrusted Site)
- **Risk**: whatever origin the user visits, the OAuth callback returns to that origin. If Supabase's "Redirect URLs" allowlist in the dashboard is misconfigured to accept wildcards (e.g. `*.vercel.app/**` for preview deploys), an attacker can:
  1. Set up `coachcrm-evil-preview-branch.vercel.app` (if Vercel previews are on).
  2. Trick a user into visiting it.
  3. User clicks "Sign in with Google", gets redirected back to the attacker's domain with a valid session token (if implicit flow, see S-03) or a valid code (if PKCE, but the attacker can hold it).
  This is Supabase's responsibility to configure correctly, but the client code is fragile — it offloads security to dashboard config that's not in VCS.
- **Evidence**: `src/pages/LoginPage.jsx:14`; no `VITE_APP_URL` hardcoded anywhere.
- **Recommendation**:
  1. Hardcode the canonical production URL:
     ```javascript
     const APP_URL = import.meta.env.VITE_APP_URL || 'https://coachcrm.vercel.app'
     const { error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: { redirectTo: APP_URL }
     })
     ```
  2. In the Supabase Dashboard → Auth → URL Configuration, set Redirect URLs to the exact production URL(s) with no wildcards.
  3. If Vercel preview deploys need auth, wire them through a separate (development) Supabase project.

---

#### S-09: Dependency risk — `exceljs` and `file-saver`

- **Location**: `package.json:19-20`
- **OWASP**: A06:2021 Vulnerable and Outdated Components
- **CWE**: CWE-1104 (Use of Unmaintained Third-Party Components)
- **Risk**:
  - **`exceljs@^4.4.0`**: maintained, but the XLSX format is historically the subject of XXE and prototype-pollution concerns. Since CoachCRM only *writes* XLSX (see `exportService.js`), the attack surface is narrower — the library's XLSX **reader** is not used. Still, exceljs pulls `archiver`/`zip-stream` which have had transitive CVEs.
  - **`file-saver@^2.0.5`**: last released 2020, unmaintained. The library is small and effectively a `<a download>` wrapper, but its lack of maintenance means no patches if any surfaces emerge. Modern alternatives: use `URL.createObjectURL` + anchor manually (the code in `exportService.js:90-93` already builds a Blob — the saveAs call could be inlined).
  - **`lucide-react@^0.577.0`**: active, no known concerns.
  - **`@supabase/supabase-js@^2.99.3`**: current as of audit date, actively maintained.
  - **`react@^19.2.4` / `react-dom`**: latest stable; no concerns.
  - **`react-router-dom@^7.13.1`**: v7 is recent; no known CVEs in the 7.x line at audit date.
  - **`vite@^8.0.1`**: brand-new major; stable; no concerns.
- **Evidence**: `package.json:17-29`.
- **Recommendation**:
  1. Replace `file-saver` with an 8-line helper using `URL.createObjectURL`:
     ```javascript
     export function saveAs(blob, filename) {
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url; a.download = filename;
       document.body.appendChild(a); a.click();
       document.body.removeChild(a); URL.revokeObjectURL(url);
     }
     ```
     Drop the dependency.
  2. Add `npm audit` (or `pnpm audit` / `npm-audit-resolver`) to CI. Run weekly.
  3. Subscribe to GitHub Dependabot / Snyk for this repo.

---

#### S-10: `exportService.js` produces XLSX with plaintext Art. 9 health data — no access control, no watermark, no audit

- **Location**: `src/services/exportService.js:4-94`
- **OWASP**: A04:2021 Insecure Design
- **CWE**: CWE-359 (Exposure of Private Personal Information); CWE-284 (Improper Access Control)
- **Risk**:
  - `exportClientDossierExcel` generates a multi-sheet XLSX containing:
    - Full client identity (id, firstName, lastName, email, phone — `exportService.js:17-27`)
    - Session-by-session history with payment amounts, payment methods, preparation notes, and **the full `report.content` narrative** (`exportService.js:74`)
    - Tags / emotional markers
  - The trigger is inferred from `ClientDetailPage.jsx:29` (`import exportClientDossierExcel`) — it's UI-accessible to any user who owns the client (RLS-scoped).
  - Concerns:
    1. No audit entry on export. The therapist can extract every client's full narrative, save to USB, leave the office — zero trace.
    2. No watermark / no indication in the XLSX of when/who exported. This is standard for RGPD Art. 30 record-keeping.
    3. No rate limit. An automated scrape of a compromised session could enumerate all clients and call `exportClientDossierExcel` for each one.
    4. File is saved to user's local disk — out of Supabase's control forever. The therapist is responsible under RGPD, but CoachCRM hasn't helped them track outflows.
- **Evidence**: `src/services/exportService.js:4-94`.
- **Recommendation**:
  1. Log exports to an `audit_exports` table: `(id, user_id, client_id, exported_at)` with RLS `SELECT own + admin`.
  2. Add a watermark cell (`exportService.js` first row): "Export réalisé par {therapistEmail} le {ISO date} — usage strictement professionnel, destruction recommandée après 30 jours".
  3. Require a confirmation dialog: "Cet export contient des données de santé (RGPD Art. 9). Vous êtes responsable de sa protection. Continuer ?"
  4. Consider encrypting the XLSX with a password set by the user (exceljs supports `workbook.xlsx.writeBuffer({ password })`).
- **Cross-reference**: §05 GDPR (Art. 5.1.f integrity & confidentiality; Art. 30 record of processing).

---

#### S-11: Session persistence in localStorage — no idle timeout, no lock on tab close

- **Location**: `src/lib/supabase.js:8-13`
  ```javascript
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storageKey: 'coachcrm-auth-token',
  }
  ```
- **OWASP**: A07:2021 Authentication Failures
- **CWE**: CWE-613 (Insufficient Session Expiration); CWE-539 (Use of Persistent Cookies Containing Sensitive Information — by analogy to localStorage)
- **Risk**:
  - Supabase defaults: 1h access token, 7-day refresh token. `autoRefreshToken: true` means the session silently refreshes as long as the tab/browser is alive.
  - No idle timeout. A therapist who leaves their laptop open for a weekend exposes every client's record. Given the data class (RGPD Art. 9), a 30-minute idle timeout is a reasonable baseline.
  - localStorage (not sessionStorage, not httpOnly cookie) is readable by any JS running in the same origin. Combined with S-07 (no CSP) and S-03 (implicit-flow token exposure), a single malicious script load is enough to exfiltrate.
  - No "remember me" UX — the user has no choice; the session just persists silently.
- **Evidence**: `src/lib/supabase.js:8-13`; no idle-detection code anywhere in `src/`.
- **Recommendation**:
  1. Add an idle-detection hook:
     ```javascript
     useEffect(() => {
       let idleTimer;
       const resetIdle = () => {
         clearTimeout(idleTimer);
         idleTimer = setTimeout(() => supabase.auth.signOut({scope:'global'}), 30 * 60 * 1000);
       };
       ['mousemove','keydown','click'].forEach(e => window.addEventListener(e, resetIdle));
       resetIdle();
       return () => { clearTimeout(idleTimer); ['mousemove','keydown','click'].forEach(e => window.removeEventListener(e, resetIdle)); };
     }, []);
     ```
  2. In the Supabase dashboard → Auth → Providers → Google, reduce the JWT expiry to 30min (matches the idle timeout).
  3. Show a "Session expiring in 2 minutes" toast before the timeout fires.

---

#### S-12: `/admin/deleted-clients` and `/admin/reseau-pro` client-side-only gate (same flaw as S-04)

- **Location**: `src/App.jsx:225-226`
- **OWASP**: A01:2021 Broken Access Control
- **CWE**: CWE-602 (Client-Side Enforcement of Server-Side Security)
- **Risk**: same pattern as S-04 — `user.role === 'admin' ? <Page /> : <Navigate to="/" />`. If `professionals` and `clients` have correct RLS (they do, per `migration.sql:175,180`), the data shown in these admin pages is already filtered to the user's own. But the `admin/reseau-pro` page is intended as an **admin-only view of all professionals**, not own-only. If RLS is therapist-scoped, the page shows nothing interesting to a non-admin who bypasses the client gate; if some admin broadening is in place (not in VCS), this is a leak path.
- **Evidence**: `src/pages/ReseauProPage.jsx:50` — `const { clients, professionals, ... } = useData()` — reads the same `professionals` as any therapist page. Suggests either (a) ReseauProPage is misnamed as "admin", or (b) it relies on a separate admin-level RLS policy not in VCS.
- **Recommendation**:
  1. Clarify the intent — if ReseauProPage is admin-view-all, it needs an admin RLS policy on `professionals`, e.g.:
     ```sql
     CREATE POLICY professionals_admin_all ON professionals FOR SELECT USING (
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
     );
     ```
  2. If it's meant as admin-own-only, rename and move out of `/admin/`.
  3. Either way, do not rely on the client-side `<Navigate />` for security.

---

#### S-13: No observability — no logging, no alerting, no Sentry

- **Location**: entire codebase; `console.error` across 75 occurrences (9 files per grep).
- **OWASP**: A09:2021 Security Logging and Monitoring Failures
- **CWE**: CWE-778 (Insufficient Logging); CWE-223 (Omission of Security-relevant Information)
- **Risk**:
  - Errors are logged to the browser console only. If a RLS breach occurs, a user will see `console.error('getClients error: permission denied')` but no alert fires anywhere.
  - No failed-login tracking. Credential-stuffing against Google OAuth is Google's problem, but application-level anomaly detection (e.g. "user logged in from unusual IP", "user exported 50 client dossiers in an hour") is absent.
  - No audit log of admin actions. When an admin deletes a user (Not yet implemented, but likely coming), the act leaves no trail.
  - RGPD Art. 33 requires breach notification within 72h. Without logs, detection is not possible, so notification is not possible, so the obligation cannot be met.
- **Evidence**: `grep -c console src/ → 75 occurrences across 9 files`. No Sentry / Datadog / LogRocket / Posthog imports in `package.json`.
- **Recommendation**:
  1. Add Sentry (React integration, 2 lines in `main.jsx`) for error capture in production. Configure it to mask PII from breadcrumbs.
  2. Create an `audit_log` table:
     ```sql
     CREATE TABLE audit_log (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL,
       action TEXT NOT NULL,         -- 'login','export','delete_client',...
       target_id UUID,
       metadata JSONB,
       created_at TIMESTAMPTZ DEFAULT now()
     );
     ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
     CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (user_id = auth.uid());
     CREATE POLICY audit_log_select_admin ON audit_log FOR SELECT USING (
       EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role='admin')
     );
     ```
  3. Emit audit events from critical paths: login (via Auth state change listener in App.jsx:132), delete client (`dataService.js:70`), export (§S-10), admin console access.
- **Cross-reference**: §05 GDPR (Art. 33 breach notification).

---

#### S-14: No MFA, no Google-domain allow-list on OAuth

- **Location**: `src/pages/LoginPage.jsx:11-16`
- **OWASP**: A07:2021 Authentication Failures
- **CWE**: CWE-308 (Use of Single-factor Authentication)
- **Risk**:
  - Only Google OAuth. If a therapist's Google account is phished (credential stuffing, SIM swap + Google recovery SMS, etc.), the attacker has full app access.
  - Google Workspace admins enforce MFA for their domain; personal Gmail accounts may or may not have 2FA enabled — the app has no way to require it.
  - CoachCRM could add a second factor (TOTP via a library like `otplib`) on top of OAuth for high-privilege actions (admin login, export). Currently it does not.
  - Combined with S-02 (no signup gate), this means a burner Gmail + no 2FA is enough to be a tenant.
- **Evidence**: `src/pages/LoginPage.jsx:11-16` — no `options.queryParams`, no `hd` (hosted-domain) parameter.
- **Recommendation**:
  1. For a therapist-grade product, require Google Workspace MFA by setting `options.queryParams: { prompt: 'select_account', hd: 'allowed-domain.com' }` if a domain lock makes sense.
  2. For admin role specifically, add a TOTP second-factor check before loading AdminPage.
  3. Document in the onboarding wizard: "We strongly recommend enabling 2FA on your Google account before using CoachCRM."

---

### 🟢 Low / Informational

---

#### S-15: `client_links` and `referred_by` — no WITH CHECK on sponsorship writes

- **Location**: `supabase/migration.sql:181` and `src/services/sponsorshipService.js:53-72`
- **Risk**: the client-side sponsorship creation (`createSponsorshipLink`) mutates `client.clientLinks` (a local array) then relies on `updateClient` RLS. The RLS policy on `clients` (`user_id = auth.uid()`) prevents writing to clients the user doesn't own — which is correct. But it does NOT prevent the user from writing **arbitrary `client_links[]` JSON values** pointing to clients they don't own. For example: `clientLinks: [{ clientId: '<other-user-client-id>', type: 'parrainage', role: 'parrain' }]`. RLS only checks the row-owner, not the JSON content.
- The app trusts the integrity of the `clientLinks` array for sponsorship chain validation (`sponsorshipService.js:31-45`), but that trust is purely client-side.
- **Recommendation**: add a DB trigger on `clients` UPDATE that validates every `client_links[].clientId` references a client owned by the same `user_id`. Or move the sponsorship link to a separate `client_links` table (which exists! `migration.sql:114-122`) and drop the JSONB duplicate on `clients`.

---

#### S-16: `upsertUser` allows client to set arbitrary `id` and `role` in principle

- **Location**: `src/services/dataService.js:16-24`
  ```javascript
  export async function upsertUser({ id, name, email, role = 'therapist', photo_url = null }) {
    const { data } = await supabase.from('users').upsert(
      { id, name, email, role, photo_url },
      { onConflict: 'email' }
    )
  }
  ```
- **Risk**: `upsertUser` is called from `App.jsx:93` with `role: 'therapist'`. Because the parameter is passed from the client, a tampered client (devtools / modified bundle) could call `upsertUser({..., role: 'admin'})` on first sign-in. Whether the upsert succeeds depends on the RLS policy on `users` (unknown — see S-05). If RLS does not have a WITH CHECK preventing `role` escalation, **any user can become admin on first login**.
- **Recommendation**:
  1. Add a Postgres check: `CREATE POLICY users_no_role_escalate ON users FOR UPDATE WITH CHECK (role = 'therapist' OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))`.
  2. Or, better: do not accept `role` from the client. Let the DB default it. Drop the `role` field from the `upsertUser` payload entirely. The first INSERT uses the CHECK constraint default (`role DEFAULT 'therapist'` in `migration.sql:10`), which is what we want.
- **Cross-reference**: S-04, S-05.

---

#### S-17: `dangerouslySetInnerHTML` — none present (confirmed clean)

- **Location**: Grep across `src/` returns no matches.
- **Risk**: None. Noted as positive confirmation. Continue to avoid.

---

#### S-18: `window.open('mailto:...')` — safe by protocol, but no user consent

- **Location**: `src/pages/LoginPage.jsx:289`
- **Risk**: `window.open('mailto:contact@coachcrm.fr?subject=Demande de démo CoachCRM', '_blank')` — the URL is a static string, so no open-redirect risk. However, the call fires from a user click (good — not spontaneous). No change needed; noted for completeness.

---

#### S-19: `onboarding` as pseudo access-control (localStorage)

- **Location**: `src/App.jsx:140,172,201`; `src/components/OnboardingWizard.jsx:30`
- **Risk**:
  - `localStorage.setItem('coachcrm_onboarding_done', 'true')` gates the onboarding wizard. It's not an access control (the user reaches the app even without it by flipping the key) — it's a UX preference.
  - No security risk; informational.
  - Minor observation: per-user scoping is absent (the key is global, not `coachcrm_onboarding_done_{userId}`). If a shared laptop is used by two therapists, the second one skips onboarding. Low impact but inconsistent with tenant isolation principles.
- **Recommendation**: prefix the key with the user ID: `coachcrm_onboarding_done_${user.id}`.

---

## RLS Policy Matrix

> Sources: `supabase/migration.sql:165-182`, `supabase/dev_rls.sql:14-26`, `audit/live_schema/tables.md:94-106`.
>
> Tables marked "Not in VCS" were created outside migration files or have undeclared policies in the live DB. Their posture **must be verified against the live Supabase instance** before production.

| Table | RLS enabled in VCS? | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|:---:|---|---|---|---|---|
| `users` | Yes (`dev_rls.sql:14`) | **none in VCS** | **none in VCS** | **none in VCS** | **none in VCS** | **Critical — see S-04, S-05. AdminPage requires a policy that exists live but not in code.** |
| `clients` | Yes (`migration.sql:165`) | `user_id = auth.uid()` (ALL) | (inherits USING) | (inherits USING) | (inherits USING) | Correct. JSONB `client_links` not validated — see S-15. |
| `sessions` | Yes (`migration.sql:166`) | `user_id = auth.uid()` (ALL) | (inherits) | (inherits) | (inherits) | Correct |
| `contacts` | Yes (`migration.sql:167`) | `user_id = auth.uid()` (ALL) | (inherits) | (inherits) | (inherits) | Correct |
| `reports` | Yes (`migration.sql:168`) | `client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` (ALL) | (inherits) | (inherits) | (inherits) | Correct but N+1 perf; see §04 perf review. |
| `settings` | Yes (`migration.sql:169`) | `user_id = auth.uid()` (ALL) | (inherits) | (inherits) | (inherits) | Correct |
| `professionals` | Yes (`migration.sql:170`) | `user_id = auth.uid()` (ALL) | (inherits) | (inherits) | (inherits) | Correct. Admin-override (if intended for ReseauProPage, S-12) not present. |
| `client_links` | Yes (`migration.sql:171`) | via parent clients (ALL) | (inherits) | (inherits) | (inherits) | Correct — but duplicated as JSONB on `clients`, see S-15. |
| `professional_referrals` | Yes (`migration.sql:172`) | via parent professionals (ALL) | (inherits) | (inherits) | (inherits) | Dead table per audit/live_schema — not queried by app |
| `therapy_cycles` | **Unknown — not in VCS** | Unknown | Unknown | Unknown | Unknown | **Critical — see S-05** |
| `invoices` | **Unknown — not in VCS** | Unknown | Unknown | Unknown | Unknown | **Critical — financial data, see S-05** |
| `invoice_sessions` | **Unknown — not in VCS** | Unknown | Unknown | Unknown | Unknown | **Critical — no `user_id` column, join-table leak risk, see S-05** |

---

## OWASP Top 10 2021 Coverage Map

| Category | Findings | Status |
|---|---|---|
| **A01 Broken Access Control** | S-02, S-04, S-05, S-12, S-15, S-16 | 🔴 Blocking |
| **A02 Cryptographic Failures** | S-01, S-03 | 🔴 Blocking |
| **A03 Injection** | — (no SQL string concat; no `dangerouslySetInnerHTML`; Supabase PostgREST parameterized; S-17 clean) | 🟢 Clear |
| **A04 Insecure Design** | S-02, S-10 | 🟠 High |
| **A05 Security Misconfiguration** | S-06, S-07 | 🟠 High |
| **A06 Vulnerable Components** | S-09 | 🟡 Medium |
| **A07 Authentication Failures** | S-03, S-08, S-11, S-14 | 🟠 High |
| **A08 Data Integrity Failures** | Implicit in S-06 (unsigned migrations) | 🟡 Medium |
| **A09 Logging & Monitoring** | S-13 | 🟡 Medium |
| **A10 SSRF** | N/A (client-only SPA, no server-side fetch) | 🟢 Clear |

---

## What's Done Well

1. **`.env` correctly gitignored** (`.gitignore:2`). Only the SETUP_GUIDE leak (S-01) exposes the values — the local `.env` is not in history.
2. **No `dangerouslySetInnerHTML`** anywhere in `src/`. Eliminates a common React XSS vector.
3. **No SQL string concatenation** — all database access goes through Supabase's parameterized PostgREST builder.
4. **Global sign-out** — `src/App.jsx:175`: `supabase.auth.signOut({ scope: 'global' })` — revokes across all tabs and devices, with explicit localStorage cleanup beforehand. Good.
5. **Error boundary** — `src/App.jsx:27-56` `GlobalErrorBoundary` prevents white-screen on uncaught errors and shows a fallback UI. Mature pattern.
6. **Separate `adapters.js` layer** — explicit snake_case ↔ camelCase translation at `src/data/adapters.js` reduces accidental column-name coupling between UI and DB. Not a security feature directly, but cleanly separates write payloads from read shapes, which makes RLS audits easier.
7. **Correct core-table RLS** — for 8 of the 12 runtime tables, RLS policies are in VCS, use `user_id = auth.uid()`, and follow the ownership model. No client-side filtering is relied upon for those.
8. **No audio/file upload code present** — the session `audio_file` column exists in the schema (`migration.sql:51`), but no code path uploads audio in the current codebase. The consent-form template (`docs/template_consentement_patient.md`) anticipates recording, but the feature is not yet built — which means no MIME validation / storage bucket policy concerns **today**. This is a point-in-time observation; if audio upload lands, re-audit.
9. **No custom crypto** — no hand-rolled hashing, no homemade encryption. All crypto is delegated to Supabase Auth (correct).
10. **HTTPS by default** via Vercel; no plaintext HTTP fallback.

---

## Remediation Plan

> Prioritization: P0 = blocks pre-production release; P1 = within 2 weeks; P2 = within 6 weeks; P3 = next major iteration.

| Prio | ID | Title | Effort | Blocks production? |
|---|---|---|---|---|
| **P0** | S-01 | Rotate anon key, purge `SETUP_GUIDE.md` from history, add gitleaks | 2 h | Yes |
| **P0** | S-02 | Add signup gate (invite-only or admin approval) | 1-2 d | Yes |
| **P0** | S-04 | Add server-side role check / RLS policy on `users` | 30 min | Yes |
| **P0** | S-05 | Audit live-DB RLS; commit missing policies for `users`, `therapy_cycles`, `invoices`, `invoice_sessions` | 4 h | Yes |
| **P0** | S-06 | Remove real emails from `seed.sql`/`transfer_data.sql`, purge history | 1 h | Yes |
| **P1** | S-03 | Switch `flowType` to `pkce` | 30 min + staging test | Recommended |
| **P1** | S-07 | Add security headers to `vercel.json` | 1 h | Recommended |
| **P1** | S-10 | Add export audit + consent dialog | 4 h | Recommended |
| **P1** | S-16 | Drop `role` from `upsertUser` payload; rely on DB default | 15 min | Recommended |
| **P2** | S-08 | Hardcode `VITE_APP_URL` for OAuth redirect | 15 min | No |
| **P2** | S-09 | Drop `file-saver`; evaluate `exceljs` alternatives | 2 h | No |
| **P2** | S-11 | Idle timeout (30 min) | 2 h | No |
| **P2** | S-12 | Clarify ReseauProPage admin policy | 2 h | No |
| **P2** | S-13 | Add Sentry + `audit_log` table | 1 d | No |
| **P2** | S-14 | Document MFA requirement; add admin TOTP | 2 d | No |
| **P3** | S-15 | Validate `client_links` JSONB with trigger | 4 h | No |
| **P3** | S-19 | Per-user onboarding key | 10 min | No |

**P0 total**: ~2 developer-days plus live-DB audit session.
**P1 total**: ~1 developer-day.

---

## Conclusion

CoachCRM's architecture is appropriate for its use case (SPA + RLS-first Supabase), and the team has demonstrated security awareness in several places (global sign-out, error boundary, no XSS sinks, parameterized DB access). However, the application is **not ready for production use with RGPD Art. 9 health data** in its current state. Five distinct pre-conditions must be met before external availability:

1. **Rotate the leaked anon key** and purge it from git history (S-01) — the single most mechanical and impactful fix.
2. **Install a signup gate** (S-02) — open registration contradicts the B2B-SaaS model claimed in marketing and unacceptably broadens the attack surface for a health-data product.
3. **Close the RLS policy gap on `users`, `therapy_cycles`, `invoices`, `invoice_sessions`** (S-04, S-05) — without this, tenant isolation is unverifiable and the admin page is either broken or leaky.
4. **Remove real personal emails** from migration scripts (S-06) — a bare-minimum GDPR hygiene issue.
5. **Add HTTP security headers** (S-07) — low-effort defense-in-depth that mitigates clickjacking, HSTS downgrade, and uncontrolled third-party content.

Once those are addressed and the live-DB RLS state is reconciled with VCS, a follow-up audit can re-score the remaining High/Medium items. The OAuth flow type (S-03) and the absence of MFA/idle timeout/observability (S-11, S-13, S-14) are meaningful weaknesses but are remediable in a second iteration without blocking the initial launch, provided the P0 items are complete.

The code quality is generally good; the security gaps are overwhelmingly in the *configuration and perimeter* layer (secrets in docs, registration policy, Vercel headers, undeclared RLS), not in the business logic. That means remediation is mostly configuration work, not a refactor — a favorable position compared to what a codebase with fundamental injection or auth-logic flaws would require.

---

*Audit conducted: 2026-04-21. Auditor: Claude (Opus 4.7). Scope: static analysis only. Live-DB verification of the four flagged tables (S-04, S-05) and the Supabase Dashboard configuration (S-08, S-14) are explicit out-of-band follow-ups and must be performed before P0 sign-off.*
