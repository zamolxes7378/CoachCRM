#!/usr/bin/env bash
# =============================================================================
# scripts/history-purge.sh — Git history purge runbook
#
# PURPOSE
#   Documents the exact commands needed to scrub three sensitive strings from
#   the full git history of CoachCRM after Track A's working-tree edits are
#   merged.
#
# !! THIS SCRIPT IS A RUNBOOK — IT DOES NOT AUTO-EXECUTE !!
#   Every command below is shown but NOT called automatically (they are inside
#   comment blocks or prefixed with "echo" / guarded by a confirmation gate).
#   A human must review, confirm H-0.1 (anon-key rotation) is complete, and
#   then run the commands manually in a coordinated team window.
#
# PRE-CONDITIONS (must all be true before running)
#   1. H-0.1 complete  — Supabase anon key has been rotated via the dashboard
#                         (Settings → API → Generate new anon key) AND the new
#                         key is live in Vercel env vars + rebuilt.
#   2. All collaborators warned — force-push rewrites history; every clone
#      must be discarded and re-cloned after the push.
#   3. GitHub "Push protection" disabled temporarily (re-enable afterwards).
#   4. No open PRs against the purged commits (close / re-base them first).
#   5. Run from a CLEAN clone on the main branch — not from a worktree.
#
# STRINGS TO PURGE
#   The following literals are removed from every blob in every commit:
#
#   STRING 1 — Live Supabase anon JWT (committed in docs/SETUP_GUIDE.md §3):
#     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jamR2b2hhZmlwaXNqY3NscmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTM3NjMsImV4cCI6MjA4OTc2OTc2M30.GCg7Foa4HR-NOXDthpRWMYAGxWTuUWfnLUoPDC5qZ9w
#
#   STRING 2 — Real personal email address (supabase/seed.sql, supabase/transfer_data.sql):
#     anne-chantal.meyer@gmail.com
#
#   STRING 3 — Supabase admin account email (docs/SETUP_GUIDE.md, supabase/transfer_data.sql):
#     claudia@kotech.ai
#
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Safety gate — confirms the operator knows this is a destructive rewrite
# ---------------------------------------------------------------------------
confirm() {
  echo ""
  echo "=== CoachCRM Git History Purge ==="
  echo ""
  echo "This will REWRITE git history to remove:"
  echo "  1. The live Supabase anon JWT (eyJhbGciOiJIUzI1NiIs…)"
  echo "  2. anne-chantal.meyer@gmail.com"
  echo "  3. claudia@kotech.ai"
  echo ""
  echo "Pre-conditions:"
  echo "  [?] H-0.1 — Has the Supabase anon key been ROTATED? (y/N)"
  read -r h01
  if [[ "$h01" != "y" && "$h01" != "Y" ]]; then
    echo "ABORT: Rotate the anon key first. The purge must happen AFTER rotation."
    exit 1
  fi

  echo "  [?] Have ALL collaborators been warned to discard their clones? (y/N)"
  read -r collab
  if [[ "$collab" != "y" && "$collab" != "Y" ]]; then
    echo "ABORT: Coordinate with the team before proceeding."
    exit 1
  fi

  echo ""
  echo "Proceeding with history purge..."
  echo ""
}

# ---------------------------------------------------------------------------
# OPTION A — git-filter-repo (preferred; faster; pip install git-filter-repo)
# ---------------------------------------------------------------------------
purge_with_filter_repo() {
  # Verify the tool is available
  if ! command -v git-filter-repo &>/dev/null; then
    echo "ERROR: git-filter-repo not found. Install it:"
    echo "  pip install git-filter-repo"
    echo "  # or: brew install git-filter-repo"
    exit 1
  fi

  # Work from a fresh, bare clone to avoid working-tree conflicts
  echo "Step 1: Create a fresh clone for the rewrite..."
  # git clone --no-local git@github.com:zamolxes7378/CoachCRM.git coachcrm-purge
  # cd coachcrm-purge

  echo "Step 2: Run filter-repo to replace each sensitive string..."

  # Replace the JWT with a placeholder token
  # git-filter-repo \
  #   --replace-text <(echo \
  #     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jamR2b2hhZmlwaXNqY3NscmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTM3NjMsImV4cCI6MjA4OTc2OTc2M30.GCg7Foa4HR-NOXDthpRWMYAGxWTuUWfnLUoPDC5qZ9w==>REDACTED_SUPABASE_ANON_KEY' \
  #   )
  #
  # Replace the personal email addresses
  # git-filter-repo \
  #   --replace-text <(printf \
  #     'anne-chantal.meyer@gmail.com==>therapist-01@example.invalid\nclaudia@kotech.ai==>admin@example.invalid' \
  #   )

  echo ""
  echo "NOTE: The three commands above are shown as comments."
  echo "Uncomment and run them in sequence from inside the fresh clone."
  echo ""
  echo "Step 3: Force-push the rewritten history..."
  # git push origin --force --all
  # git push origin --force --tags

  echo "Step 4: Request GitHub to purge cached views of the old objects:"
  echo "  → https://support.github.com/contact (select: Sensitive data removal)"
  echo "  → Or use the GitHub API: POST /repos/{owner}/{repo}/git/refs"
  echo "  → Enable 'Push protection' again in repo Security settings."

  echo "Step 5: All collaborators must re-clone:"
  echo "  git clone git@github.com:zamolxes7378/CoachCRM.git"
}

# ---------------------------------------------------------------------------
# OPTION B — BFG Repo Cleaner (alternative; requires Java; bfg.jar)
# ---------------------------------------------------------------------------
purge_with_bfg() {
  echo ""
  echo "=== BFG approach ==="
  echo ""
  echo "1. Download BFG:"
  echo "   wget https://repo1.maven.org/maven2/com/madgag/bfg/1.15.0/bfg-1.15.0.jar -O bfg.jar"
  echo ""
  echo "2. Create a bare mirror clone:"
  echo "   git clone --mirror git@github.com:zamolxes7378/CoachCRM.git coachcrm-mirror.git"
  echo "   cd coachcrm-mirror.git"
  echo ""
  echo "3. Create a file listing the strings to replace (one per line, ==>REPLACEMENT):"
  cat <<'REPLACEMENTS'
   File: /tmp/replacements.txt
   ---
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jamR2b2hhZmlwaXNqY3NscmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTM3NjMsImV4cCI6MjA4OTc2OTc2M30.GCg7Foa4HR-NOXDthpRWMYAGxWTuUWfnLUoPDC5qZ9w==>REDACTED_SUPABASE_ANON_KEY
   anne-chantal.meyer@gmail.com==>therapist-01@example.invalid
   claudia@kotech.ai==>admin@example.invalid
REPLACEMENTS
  echo ""
  echo "4. Run BFG:"
  echo "   java -jar bfg.jar --replace-text /tmp/replacements.txt coachcrm-mirror.git"
  echo ""
  echo "5. Expire and repack:"
  echo "   cd coachcrm-mirror.git"
  echo "   git reflog expire --expire=now --all && git gc --prune=now --aggressive"
  echo ""
  echo "6. Push (force):"
  echo "   git push --force"
  echo ""
  echo "7. Request GitHub history purge and re-enable Push protection (same as OPTION A step 4-5)."
}

# ---------------------------------------------------------------------------
# VERIFICATION — confirm the strings are gone after the rewrite
# ---------------------------------------------------------------------------
verify_purge() {
  echo ""
  echo "=== Post-purge verification ==="
  echo ""
  echo "Run these in the rewritten repo. All should return EMPTY:"
  echo ""
  echo "  git log -p | grep -i 'eyJhbGciOiJIUzI1NiIs'"
  echo "  git log -p | grep -i 'anne-chantal\\.meyer'"
  echo "  git log -p | grep -i 'claudia@kotech\\.ai'"
  echo "  git log -p | grep -i 'ncjdvohafipisjcslrkk'"
  echo ""
  echo "Also verify the working tree is clean:"
  echo "  grep -r 'eyJhbGciOiJIUzI1NiIs' . --include='*.md' --include='*.sql' --include='*.js'"
  echo "  grep -r 'anne-chantal.meyer' . --include='*.sql' --include='*.md'"
  echo "  grep -r 'claudia@kotech.ai' . --include='*.sql' --include='*.md'"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo ""
  echo "This is a RUNBOOK script. It prints instructions and checks pre-conditions."
  echo "Destructive git commands are shown as comments — you must run them manually."
  echo ""
  echo "Choose purge method:"
  echo "  A) git-filter-repo (recommended)"
  echo "  B) BFG Repo Cleaner"
  echo "  V) Verification only (post-purge check)"
  echo "  Q) Quit"
  read -r choice

  case "$choice" in
    A|a)
      confirm
      purge_with_filter_repo
      verify_purge
      ;;
    B|b)
      confirm
      purge_with_bfg
      verify_purge
      ;;
    V|v)
      verify_purge
      ;;
    Q|q)
      echo "Quit."
      exit 0
      ;;
    *)
      echo "Invalid choice."
      exit 1
      ;;
  esac
}

main
