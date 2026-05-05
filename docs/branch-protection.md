# GitHub Branch Protection — Manual Runbook

## Objective
Protect `main` branch by requiring PR reviews and CI green before merge, preventing force-pushes and stale review dismissal.

## Prerequisites
- Admin or "Maintain" role on the repository
- GitHub web UI access

## Steps

### 1. Navigate to Branch Protection Rules
1. Go to the repository on GitHub
2. Click **Settings** (top right)
3. Click **Branches** in the left sidebar
4. Click **Add rule** under "Branch protection rules"

### 2. Configure Branch Name Pattern
- **Branch name pattern:** `main`

### 3. Require a Pull Request Review
- ✅ **Require a pull request before merging**
  - Required approving reviews: `1`
  - ✅ **Require code owner reviews** (if CODEOWNERS file exists)
  - ✅ **Dismiss stale pull request approvals when new commits are pushed**
  - ✗ **Require review from Code Owners before the pull request can be merged** (optional, only if using CODEOWNERS)

### 4. Require CI Status Checks to Pass
- ✅ **Require status checks to pass before merging**
  - ✅ **Require branches to be up to date before merging**
  - Select these status checks:
    - `ci / Build, Lint & Test`
    - `lighthouse-ci / Lighthouse CI`
    - `axe-ci / axe Accessibility`

### 5. Restrict Force Pushes
- ✅ **Restrict who can push to matching branches**
  - Allow force pushes:
    - ✗ (none — disable force pushes entirely)
- ✗ **Restrict dismissals of pull request reviews**
  - (Leave unchecked; stale review dismissal is already enabled above)

### 6. Require Signed Commits (Optional)
- ✗ **Require signed commits**
  - (Optional; enable only if organization requires GPG-signed commits)

### 7. Save
Click **Create** to save the rule.

## Verification

After saving, verify by attempting a test PR:
1. Create a small test branch from `main`
2. Make a trivial commit (e.g., add a comment)
3. Push and open a PR
4. Confirm:
   - ✅ PR cannot be merged without 1 approval
   - ✅ PR cannot be merged until CI jobs pass
   - ✅ "Approve" button appears and changes permissions
   - ✅ "Dismiss review" only works if approval is stale (after new commit)

## Rollback

To remove protection:
1. **Settings** → **Branches**
2. Find the `main` rule
3. Click ⋯ (three dots) → **Delete**
4. Confirm

## Notes

- The rule applies to all users (including admins) unless **"Allow force pushes"** is explicitly enabled for a specific user type.
- **CI status checks** will block merge until all selected jobs pass; configure these AFTER the jobs are added to `.github/workflows/ci.yml`.
- If a job is disabled or renamed, the branch rule will not automatically update — manually correct the status check list.
