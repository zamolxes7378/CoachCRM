# Encryption Runbook — CoachCRM Column-Level Encryption

**Track:** P1-Z (Health data encryption & access log)
**Decision basis:** `docs/compliance/hds_decision.md` (2026-04-22) — non-regulated HDS persona
**Mechanism:** pgsodium Transparent Column Encryption (TCE)
**Findings closed:** G-03, G-06, G-10, R-12

---

## 1. Overview

CoachCRM stores Art. 9 sensitive data (session summaries, clinical notes, AI syntheses, audio file paths) that is encrypted at the column level via **pgsodium TCE** — a mechanism built into the Supabase Postgres image that encrypts specific columns using authenticated encryption (XChaCha20-Poly1305 via libsodium) and decrypts them automatically for authorised roles.

This runbook covers:
- Where the key lives
- How to rotate the key
- Re-encryption strategy for historical rows
- Recovery if the key is lost
- Dry-run validation steps
- Checklist for the next rotation

---

## 2. Encrypted Columns

| Table | Column | Original type | Encrypted type | AAD context |
|-------|--------|--------------|----------------|-------------|
| `reports` | `narrative` | TEXT | bytea | `reports.narrative` |
| `reports` | `vigilance` | JSONB | bytea | `reports.vigilance` |
| `clients` | `notes` | TEXT | bytea | `clients.notes` |
| `clients` | `ai_synthesis` | TEXT | bytea | `clients.ai_synthesis` |
| `sessions` | `summary` | TEXT | bytea | `sessions.summary` |
| `sessions` | `audio_file` | TEXT | bytea | `sessions.audio_file` |

**AAD (Additional Authenticated Data):** Each column uses a unique AAD string (the `table.column` name) to prevent ciphertext from one column being transplanted to another.

---

## 3. Key Architecture

### 3.1 Key storage

The encryption key is stored in pgsodium's internal key table:

```sql
SELECT id, name, key_type, created
FROM pgsodium.key
WHERE name = 'coach-crm-app-key';
```

The row stores the **encrypted** key material — it is encrypted by the Supabase-managed **root key** (a master key stored in the Supabase infrastructure, not accessible to application code or database users). The key UUID (not key material) is embedded in security labels on each encrypted column.

### 3.2 What is stored where

| Location | What | Who can access |
|----------|------|----------------|
| `pgsodium.key` | Encrypted key material (encrypted by root key) | pgsodium engine only |
| Column security labels | Key UUID reference | Postgres superuser via `pg_seclabel` |
| `docs/engineering/encryption.md` | Key name (`coach-crm-app-key`) and rotation procedure | Engineering team |
| Application code / env vars | **Nothing** — key material never leaves pgsodium | N/A |

### 3.3 Key UUID inventory

After running migration `20260422103000_vault_keys.sql`, record the key UUID here:

```
Key name: coach-crm-app-key
Key UUID: <record from: SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key'>
Created:  <date>
Plan:     Supabase <Free/Pro/Team/Enterprise>
Region:   eu-west-2 (London) / eu-central-1 (Frankfurt) — confirm in Supabase dashboard
```

**Update this section after every key rotation.**

---

## 4. Key Rotation Procedure

### 4.1 Prerequisites

- [ ] Test the rotation in a branch/staging environment first
- [ ] Take a full database backup (Supabase Dashboard → Database → Backups → Download)
- [ ] Notify stakeholders of a brief maintenance window (re-encryption requires a full-table UPDATE)
- [ ] Confirm the new key is created before starting re-encryption (do not delete the old key yet)

### 4.2 Step-by-step rotation

**Step 1: Create the new key**

```sql
-- In a superuser session (Supabase Dashboard → SQL Editor)
SELECT pgsodium.create_key(
  name     := 'coach-crm-app-key-v2',
  key_type := 'aead-det'
);

-- Record the new UUID
SELECT id, name, created FROM pgsodium.key WHERE name = 'coach-crm-app-key-v2';
```

**Step 2: Re-encrypt each column (wrap in a transaction)**

For each target column, decrypt with the old key and re-encrypt with the new key. The pattern is:

```sql
BEGIN;

DO $$
DECLARE
  v_old_key UUID;
  v_new_key UUID;
BEGIN
  SELECT id INTO v_old_key FROM pgsodium.key WHERE name = 'coach-crm-app-key'   LIMIT 1;
  SELECT id INTO v_new_key FROM pgsodium.key WHERE name = 'coach-crm-app-key-v2' LIMIT 1;

  IF v_old_key IS NULL OR v_new_key IS NULL THEN
    RAISE EXCEPTION 'Key(s) not found — aborting re-encryption.';
  END IF;

  -- reports.narrative
  UPDATE reports
  SET narrative = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(narrative, convert_to('reports.narrative', 'utf8'), v_old_key),
    convert_to('reports.narrative', 'utf8'),
    v_new_key
  )
  WHERE narrative IS NOT NULL;
  RAISE NOTICE 'reports.narrative re-encrypted: % rows', FOUND;

  -- reports.vigilance
  UPDATE reports
  SET vigilance = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(vigilance, convert_to('reports.vigilance', 'utf8'), v_old_key),
    convert_to('reports.vigilance', 'utf8'),
    v_new_key
  )
  WHERE vigilance IS NOT NULL;
  RAISE NOTICE 'reports.vigilance re-encrypted: % rows', FOUND;

  -- clients.notes
  UPDATE clients
  SET notes = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(notes, convert_to('clients.notes', 'utf8'), v_old_key),
    convert_to('clients.notes', 'utf8'),
    v_new_key
  )
  WHERE notes IS NOT NULL;
  RAISE NOTICE 'clients.notes re-encrypted: % rows', FOUND;

  -- clients.ai_synthesis
  UPDATE clients
  SET ai_synthesis = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(ai_synthesis, convert_to('clients.ai_synthesis', 'utf8'), v_old_key),
    convert_to('clients.ai_synthesis', 'utf8'),
    v_new_key
  )
  WHERE ai_synthesis IS NOT NULL;
  RAISE NOTICE 'clients.ai_synthesis re-encrypted: % rows', FOUND;

  -- sessions.summary
  UPDATE sessions
  SET summary = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(summary, convert_to('sessions.summary', 'utf8'), v_old_key),
    convert_to('sessions.summary', 'utf8'),
    v_new_key
  )
  WHERE summary IS NOT NULL;
  RAISE NOTICE 'sessions.summary re-encrypted: % rows', FOUND;

  -- sessions.audio_file
  UPDATE sessions
  SET audio_file = pgsodium.crypto_aead_det_encrypt(
    pgsodium.crypto_aead_det_decrypt(audio_file, convert_to('sessions.audio_file', 'utf8'), v_old_key),
    convert_to('sessions.audio_file', 'utf8'),
    v_new_key
  )
  WHERE audio_file IS NOT NULL;
  RAISE NOTICE 'sessions.audio_file re-encrypted: % rows', FOUND;

END $$;

COMMIT;
```

**Step 3: Update security labels to reference the new key**

```sql
DO $$
DECLARE v_new_key UUID;
BEGIN
  SELECT id INTO v_new_key FROM pgsodium.key WHERE name = 'coach-crm-app-key-v2' LIMIT 1;
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.narrative   IS 'encrypt with key id %s'$sql$, v_new_key);
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN reports.vigilance   IS 'encrypt with key id %s'$sql$, v_new_key);
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.notes       IS 'encrypt with key id %s'$sql$, v_new_key);
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN clients.ai_synthesis IS 'encrypt with key id %s'$sql$, v_new_key);
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.summary    IS 'encrypt with key id %s'$sql$, v_new_key);
  EXECUTE format($sql$SECURITY LABEL FOR pgsodium ON COLUMN sessions.audio_file IS 'encrypt with key id %s'$sql$, v_new_key);
  RAISE NOTICE 'Security labels updated to new key.';
END $$;
```

**Step 4: Update decryption views**

Re-run the view definitions from `20260422103100_encrypt_sensitive_columns.sql`, replacing the `WHERE name = 'coach-crm-app-key'` references with `'coach-crm-app-key-v2'`.

**Step 5: Validate**

```sql
-- Spot-check: attempt to decrypt one row with the new key
SELECT
  convert_from(
    pgsodium.crypto_aead_det_decrypt(
      narrative,
      convert_to('reports.narrative', 'utf8'),
      (SELECT id FROM pgsodium.key WHERE name = 'coach-crm-app-key-v2')
    ),
    'utf8'
  ) AS narrative_plaintext
FROM reports
WHERE narrative IS NOT NULL
LIMIT 1;
```

**Step 6: Rename keys for clarity**

```sql
UPDATE pgsodium.key SET name = 'coach-crm-app-key-v1-retired' WHERE name = 'coach-crm-app-key';
UPDATE pgsodium.key SET name = 'coach-crm-app-key'             WHERE name = 'coach-crm-app-key-v2';
```

**Step 7: Update this runbook**

Update §3.3 (Key UUID inventory) with the new UUID and rotation date.

**Step 8 (30 days later): Delete the retired key**

After confirming no rows remain encrypted with the old key:

```sql
-- Confirm no rows still use the old key (they should all be re-encrypted by now)
-- If count > 0, re-run the re-encryption block before deleting.
SELECT COUNT(*) FROM reports   WHERE narrative   IS NOT NULL;  -- all should be on new key
SELECT COUNT(*) FROM clients   WHERE notes        IS NOT NULL;  -- all should be on new key

-- Delete retired key
DELETE FROM pgsodium.key WHERE name = 'coach-crm-app-key-v1-retired';
```

---

## 5. Re-encryption of Historical Rows

When new rows are written after the migration, pgsodium TCE encrypts them automatically on INSERT/UPDATE via the security label. Historical rows that existed before the migration are encrypted in-place by the `UPDATE ... SET col = col` block inside `20260422103100_encrypt_sensitive_columns.sql`.

To verify all rows are encrypted:

```sql
-- All non-NULL values should be bytea (encrypted); plaintext text would fail this cast
SELECT
  (SELECT COUNT(*) FROM reports  WHERE narrative   IS NOT NULL) AS reports_narrative_count,
  (SELECT COUNT(*) FROM reports  WHERE vigilance    IS NOT NULL) AS reports_vigilance_count,
  (SELECT COUNT(*) FROM clients  WHERE notes        IS NOT NULL) AS clients_notes_count,
  (SELECT COUNT(*) FROM clients  WHERE ai_synthesis IS NOT NULL) AS clients_ai_synthesis_count,
  (SELECT COUNT(*) FROM sessions WHERE summary      IS NOT NULL) AS sessions_summary_count,
  (SELECT COUNT(*) FROM sessions WHERE audio_file   IS NOT NULL) AS sessions_audio_file_count;

-- Check column types (all should show 'bytea')
SELECT column_name, data_type
FROM information_schema.columns
WHERE (table_name, column_name) IN (
  ('reports',  'narrative'),
  ('reports',  'vigilance'),
  ('clients',  'notes'),
  ('clients',  'ai_synthesis'),
  ('sessions', 'summary'),
  ('sessions', 'audio_file')
);
```

---

## 6. Recovery If Key Is Lost

**If the pgsodium key is permanently lost, the data in the encrypted columns is unrecoverable by design.**

This is the expected behaviour for strong encryption at rest — it protects against storage-layer compromise at the cost of irrecoverability without the key.

### 6.1 Prevention

- Supabase manages the root key that protects the pgsodium key table. As long as the Supabase project exists and the root key has not been deleted, pgsodium can decrypt your data.
- The Supabase root key is backed up by Supabase infrastructure (SOC 2 Type II controls apply).
- You cannot export or backup the pgsodium key material — this is by design.

### 6.2 Risk scenarios

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Supabase project deleted | Full data loss (encrypted + plaintext) | Supabase database backup before deletion |
| pgsodium.key row deleted accidentally | Encrypted columns unreadable | Restore from Supabase database backup taken before deletion |
| Supabase root key loss | Full encrypted data loss | Supabase infrastructure responsibility; SOC 2 controls |
| Application key row deleted, project intact | Encrypted columns unreadable | Restore from DB backup; key row is the only decryption path |

### 6.3 Recovery procedure (key row deleted, backup available)

1. Restore the pgsodium.key row from the most recent database backup:
   ```bash
   # Restore only the pgsodium.key table from backup
   pg_restore --table=pgsodium.key --data-only backup.dump | psql $DATABASE_URL
   ```
2. Re-apply security labels (run the security label block from `20260422103100_encrypt_sensitive_columns.sql`).
3. Verify decryption via the spot-check query in §4 Step 5.

### 6.4 If recovery is impossible

If backup restoration fails and the key is confirmed lost:
1. Identify affected rows via `information_schema.columns` (bytea columns with non-NULL values).
2. NULL out the encrypted columns (data is unreadable anyway):
   ```sql
   UPDATE reports  SET narrative = NULL, vigilance = NULL   WHERE narrative IS NOT NULL OR vigilance IS NOT NULL;
   UPDATE clients  SET notes = NULL, ai_synthesis = NULL    WHERE notes IS NOT NULL OR ai_synthesis IS NOT NULL;
   UPDATE sessions SET summary = NULL, audio_file = NULL    WHERE summary IS NOT NULL OR audio_file IS NOT NULL;
   ```
3. Notify affected users per RGPD Art. 33 (72-hour breach notification to CNIL if the lost data constitutes a breach — consult DPO).
4. Generate a new key and re-apply encryption for future data.

---

## 7. Paid Plan Gate

pgsodium is pre-installed on all Supabase plans (Free, Pro, Team, Enterprise) as part of the Supabase Postgres distribution. **No plan upgrade is required** for pgsodium TCE.

However, if you see `pgsodium not available` from the migration:

1. Check: `SELECT * FROM pg_available_extensions WHERE name = 'pgsodium';`
2. If empty: contact Supabase support (this is unexpected on any hosted plan).
3. Self-hosted deployments: ensure the Supabase Postgres image is used (not vanilla Postgres), or install `postgresql-pgsodium` manually.

---

## 8. Dry-run Validation Steps

Before any rotation or migration in production, validate in a staging branch:

**Step 1: Verify extension availability**
```sql
SELECT name, installed_version FROM pg_available_extensions WHERE name IN ('pgsodium', 'vault');
```

**Step 2: Verify key exists**
```sql
SELECT id, name, key_type, created FROM pgsodium.key WHERE name = 'coach-crm-app-key';
```

**Step 3: Verify column types**
```sql
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_name, column_name) IN (
  ('reports','narrative'), ('reports','vigilance'),
  ('clients','notes'), ('clients','ai_synthesis'),
  ('sessions','summary'), ('sessions','audio_file')
);
-- Expected: all data_type = 'bytea'
```

**Step 4: Verify decryption views work**
```sql
-- As an authenticated therapist user (or service_role in SQL Editor)
SELECT id, narrative IS NOT NULL AS has_narrative FROM reports_decrypted LIMIT 3;
SELECT id, notes     IS NOT NULL AS has_notes     FROM clients_decrypted LIMIT 3;
SELECT id, summary   IS NOT NULL AS has_summary   FROM sessions_decrypted LIMIT 3;
```

**Step 5: Verify access_log writes**
```sql
-- Simulate a read (triggers logAccess in application layer)
-- Then check:
SELECT entity, action, accessed_at FROM access_log ORDER BY accessed_at DESC LIMIT 5;
```

**Step 6: Verify purge dry-run**
```sql
SELECT * FROM purge_expired_data(dry_run => true);
-- Should return access_log row with rows_affected >= 0
```

---

## 9. Rotation Checklist

Use this checklist for every key rotation:

- [ ] Database backup taken and verified (restore test on copy)
- [ ] New key created in pgsodium.key with version suffix
- [ ] Re-encryption script tested on staging with real data volume
- [ ] Row counts verified: same non-NULL count before and after re-encryption
- [ ] Security labels updated on all 6 columns
- [ ] Decryption views recreated with new key name reference
- [ ] Spot-check decryption returns legible plaintext
- [ ] Old key renamed to `-retired` suffix
- [ ] Runbook §3.3 (Key UUID inventory) updated with new UUID and date
- [ ] 30-day calendar reminder set to delete retired key
- [ ] DPO notified of rotation (document in compliance log)
- [ ] Retired key deleted after 30-day grace period

---

## 10. Access Log Reference

Every read of a sensitive column emits an `access_log` row. The log is retained for 6 months then hard-deleted by `purge_expired_data()`.

Query the access log (admin only):

```sql
-- Recent reads of report narratives
SELECT user_id, entity_id, action, accessed_at
FROM access_log
WHERE entity = 'report' AND action = 'read_report'
ORDER BY accessed_at DESC
LIMIT 100;

-- Check if a specific client's data was accessed
SELECT al.user_id, u.email, al.action, al.accessed_at
FROM access_log al
JOIN auth.users u ON u.id = al.user_id
WHERE al.entity = 'client' AND al.entity_id = '<client-uuid>'
ORDER BY al.accessed_at DESC;

-- Count per entity type
SELECT entity, action, COUNT(*), MAX(accessed_at) AS latest
FROM access_log
GROUP BY entity, action
ORDER BY entity, action;
```

---

*Last updated: 2026-04-22 — P1-Z initial implementation*
*Next review: 2027-04-22 (or at next key rotation)*
*DPO contact: refer to docs/compliance/ropa.md*
