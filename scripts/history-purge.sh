#!/usr/bin/env bash
# =============================================================================
# scripts/history-purge.sh — Legacy-key disable + (optional) git-history scrub
#
# CONTEXT
#   The legacy Supabase anon JWT was committed to docs/SETUP_GUIDE.md before
#   this branch and exposed publicly when this branch itself was pushed (it
#   contained the JWT as a string-to-purge). CoachCRM has since migrated to
#   Supabase's publishable / secret API keys (sb_publishable_*, sb_secret_*).
#
# PRIMARY MITIGATION (sufficient on its own)
#   Disable the legacy anon and service_role keys in the Supabase dashboard.
#   Once disabled, the leaked JWT is INERT — the value cannot authenticate
#   to anything. No force-push, no history rewrite, no team disruption.
#
# OPTIONAL SECONDARY MITIGATION (cosmetic only, after disable)
#   Scrub the leaked literals from git history with git-filter-repo or BFG.
#   This removes the strings from blob storage and reduces fingerprintable
#   surface for secret scanners — but provides no security benefit once the
#   keys are disabled.
#
# !! THIS SCRIPT IS A RUNBOOK — IT DOES NOT AUTO-EXECUTE !!
#   Every destructive command below is shown but NOT called automatically
#   (commented or guarded by a confirmation gate). A human must review,
#   confirm pre-conditions, and run the commands manually.
#
# STRINGS TO PURGE (provided out-of-band, NOT inlined in this file)
#   The literals to remove are sensitive and must NOT live in the repo.
#   Provide them via an untracked sidecar file:
#
#     scripts/.purge-strings.local      # gitignored
#
#   Format (one per line, source==>replacement):
#     <leaked-literal>==>REDACTED_LEGACY_SUPABASE_ANON_KEY
#     anne-chantal.meyer@gmail.com==>therapist-01@example.invalid
#     claudia@kotech.ai==>admin@example.invalid
#
#   The script reads this file at runtime — it is never tracked by git.
#
# =============================================================================

set -euo pipefail

PURGE_STRINGS_FILE="scripts/.purge-strings.local"

# ---------------------------------------------------------------------------
# Pre-condition: confirm legacy keys are disabled (primary mitigation)
# ---------------------------------------------------------------------------
confirm_keys_disabled() {
  echo ""
  echo "=== Pre-condition: Supabase legacy keys disabled ==="
  echo ""
  echo "Have you migrated to publishable/secret keys AND disabled the"
  echo "legacy anon/service_role keys in the Supabase dashboard?"
  echo ""
  echo "  https://supabase.com/dashboard/project/<ref>/settings/api-keys"
  echo "  -> 'Legacy API Keys' section -> Disable each row"
  echo ""
  read -rp "Disabled? (y/N) " disabled
  if [[ "$disabled" != "y" && "$disabled" != "Y" ]]; then
    echo "ABORT: Disable the legacy keys FIRST. That alone makes the leak inert."
    echo "       History scrub is optional cosmetic cleanup after that."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# Pre-condition: confirm the operator understands the impact
# ---------------------------------------------------------------------------
confirm_history_rewrite() {
  echo ""
  echo "=== Optional: scrub leaked literals from git history ==="
  echo ""
  echo "This is COSMETIC — the leaked keys are already inert. Proceed only"
  echo "if your team has decided the history scrub is worth the disruption."
  echo ""
  echo "Side-effects of force-push:"
  echo "  - Every existing clone of CoachCRM becomes invalid."
  echo "  - All collaborators must discard and re-clone."
  echo "  - All open PRs against the rewritten commits must be re-based."
  echo "  - GitHub may still cache old commit objects (file a sensitive-data"
  echo "    removal request to fully purge: github.com/contact)."
  echo ""
  read -rp "Have ALL collaborators been warned and prepared? (y/N) " collab
  if [[ "$collab" != "y" && "$collab" != "Y" ]]; then
    echo "ABORT: Coordinate with the team first."
    exit 1
  fi

  if [[ ! -f "$PURGE_STRINGS_FILE" ]]; then
    echo ""
    echo "ABORT: $PURGE_STRINGS_FILE not found."
    echo "       Create it (gitignored) with one 'source==>replacement' per line."
    echo "       See the header of this script for format."
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# OPTION A — git-filter-repo (preferred; faster; pip install git-filter-repo)
# ---------------------------------------------------------------------------
purge_with_filter_repo() {
  if ! command -v git-filter-repo &>/dev/null; then
    echo "ERROR: git-filter-repo not found. Install it:"
    echo "  pip install git-filter-repo   # or: brew install git-filter-repo"
    exit 1
  fi

  echo ""
  echo "=== git-filter-repo workflow ==="
  echo ""
  echo "Step 1 - fresh clone (do NOT run filter-repo on a worktree):"
  echo "  git clone --no-local git@github.com:zamolxes7378/CoachCRM.git coachcrm-purge"
  echo "  cd coachcrm-purge"
  echo ""
  echo "Step 2 - apply the replacements from $PURGE_STRINGS_FILE:"
  echo "  cp ../$PURGE_STRINGS_FILE .purge-strings"
  echo "  git-filter-repo --replace-text .purge-strings"
  echo "  rm .purge-strings"
  echo ""
  echo "Step 3 - force-push (ALL branches + tags):"
  echo "  git remote add origin git@github.com:zamolxes7378/CoachCRM.git"
  echo "  git push origin --force --all"
  echo "  git push origin --force --tags"
  echo ""
  echo "Step 4 - request GitHub purge cached objects:"
  echo "  https://docs.github.com/en/site-policy/content-removal-policies/github-sensitive-data-removal-policy"
  echo ""
  echo "Step 5 - every collaborator re-clones from scratch."
}

# ---------------------------------------------------------------------------
# OPTION B — BFG Repo Cleaner (alternative; requires Java)
# ---------------------------------------------------------------------------
purge_with_bfg() {
  echo ""
  echo "=== BFG workflow ==="
  echo ""
  echo "Step 1 - install BFG:"
  echo "  wget https://repo1.maven.org/maven2/com/madgag/bfg/1.15.0/bfg-1.15.0.jar -O bfg.jar"
  echo ""
  echo "Step 2 - bare mirror clone:"
  echo "  git clone --mirror git@github.com:zamolxes7378/CoachCRM.git coachcrm-mirror.git"
  echo ""
  echo "Step 3 - apply replacements:"
  echo "  java -jar bfg.jar --replace-text $PURGE_STRINGS_FILE coachcrm-mirror.git"
  echo ""
  echo "Step 4 - expire and repack:"
  echo "  cd coachcrm-mirror.git"
  echo "  git reflog expire --expire=now --all && git gc --prune=now --aggressive"
  echo ""
  echo "Step 5 - force-push:"
  echo "  git push --force"
  echo ""
  echo "Step 6 - GitHub purge request + re-clones (same as filter-repo Step 4-5)."
}

# ---------------------------------------------------------------------------
# Verify the purge worked (against the rewritten clone)
# ---------------------------------------------------------------------------
verify_purge() {
  echo ""
  echo "=== Post-purge verification ==="
  echo ""
  echo "Inside the rewritten clone, all of these should return EMPTY:"
  echo ""
  echo "  while IFS= read -r line; do"
  echo "    needle=\"\${line%%==>*}\""
  echo "    git log -p --all -S\"\$needle\" | head -3"
  echo "  done < $PURGE_STRINGS_FILE"
  echo ""
  echo "Working-tree check:"
  echo "  while IFS= read -r line; do"
  echo "    needle=\"\${line%%==>*}\""
  echo "    grep -r \"\$needle\" . --include='*.md' --include='*.sql' --include='*.js' || true"
  echo "  done < $PURGE_STRINGS_FILE"
}

# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------
main() {
  echo ""
  echo "=== CoachCRM Legacy-Key Mitigation Runbook ==="
  echo ""
  echo "PRIMARY: Disable legacy keys in Supabase dashboard (1 click; no force-push)."
  echo "OPTIONAL: Scrub leaked literals from git history (cosmetic; disruptive)."
  echo ""
  echo "Choose:"
  echo "  D) Confirm legacy-key disable status (primary mitigation)"
  echo "  A) Optional history scrub via git-filter-repo"
  echo "  B) Optional history scrub via BFG"
  echo "  V) Verification only (post-scrub check)"
  echo "  Q) Quit"
  read -rp "> " choice

  case "$choice" in
    D|d) confirm_keys_disabled; echo "OK - leaked literals are now inert. History scrub is optional." ;;
    A|a) confirm_keys_disabled; confirm_history_rewrite; purge_with_filter_repo; verify_purge ;;
    B|b) confirm_keys_disabled; confirm_history_rewrite; purge_with_bfg; verify_purge ;;
    V|v) verify_purge ;;
    Q|q) echo "Quit." ;;
    *)   echo "Invalid choice."; exit 1 ;;
  esac
}

main
