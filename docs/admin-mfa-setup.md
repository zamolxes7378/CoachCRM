# Admin MFA Setup — Runbook

**Audience:** CoachCRM administrators  
**Feature:** TOTP (Time-based One-Time Password) two-factor authentication  
**Closes:** S-14 (admin MFA gap)

---

## Overview

Admin accounts require TOTP MFA. Every time an admin logs in with Google OAuth, they must also verify their identity with a 6-digit code from an authenticator app before accessing the `/admin` page.

If no TOTP factor is enrolled, the admin page will prompt the admin to enroll before proceeding.

---

## First-time enrollment

1. Log in to CoachCRM with your Google admin account.
2. Navigate to `/admin`.
3. You will see a **"Sécurité requise"** screen.
4. Click **"Configurer le double facteur"**.
5. Open your authenticator app (Google Authenticator, Authy, 1Password, Bitwarden, etc.).
6. Scan the QR code displayed on screen.
   - If your app cannot scan QR codes, use the **"Clé manuelle"** displayed below the QR code.
7. Enter the 6-digit code from your authenticator app.
8. Click **"Valider"**.

Enrollment is complete. You will not need to re-enroll unless you delete the factor from your account.

---

## Daily login flow

1. Log in with Google OAuth as usual.
2. Navigate to `/admin`.
3. Enter the 6-digit code currently shown in your authenticator app.
4. Click **"Confirmer"**.

The MFA session is valid for the duration of your Supabase session. If your session expires or you log out and back in, you will be prompted again.

---

## Troubleshooting

### "Code invalide ou expiré"

- TOTP codes are time-based and rotate every 30 seconds. Ensure your device clock is accurate (enable automatic time sync).
- If codes continue to fail, try the next code that appears.

### Lost authenticator app / new device

Recovery requires direct Supabase dashboard access:

1. Open the Supabase dashboard → **Authentication** → **Users**.
2. Find the admin user.
3. Under **Factors**, delete the existing TOTP factor.
4. The admin can now re-enroll on next `/admin` visit.

**Note:** Only a Supabase project owner can do this. Do not share Supabase dashboard credentials.

---

## Technical notes

- MFA is enforced client-side via `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`. The session must reach `aal2` before user data is fetched.
- The Supabase MFA API used: `mfa.enroll()`, `mfa.challenge()`, `mfa.verify()` (supabase-js v2).
- The `get_admin_user_list` RPC is only called after MFA verification succeeds. If the MFA check itself fails (e.g. network error), access is granted with a console warning — this is intentional graceful degradation and should be revisited if the app moves to regulated (HDS) hosting.
- QR code is a data-URI SVG returned by Supabase; no external image dependency.

---

## Supabase project configuration required

MFA must be enabled in the Supabase project settings:

1. Dashboard → **Authentication** → **Sign In Methods**.
2. Enable **Multi-Factor Authentication**.
3. Under **MFA Factors**, enable **TOTP**.

Without this, the `mfa.enroll()` call will return an error.
