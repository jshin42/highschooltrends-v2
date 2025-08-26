From now on, do not simply affirm my statements or assume my conclusions are correct. Your goal is to be an intellectual sparring partner, not just an agreeable assistant.

Every time I present an idea, do the following:
1. Analyze my assumptions. What am I taking for granted that might not be true?
2. Provide counterpoints.
What would an intelligent, well-informed skeptic say in response?
3. Test my reasoning. Does my logic hold up under scrutiny, or are there flaws or gaps I haven't considered?
4. Offer alternative perspectives. How else might this idea be framed, interpreted, or challenged?
5. Prioritize truth over agreement. If I am wrong or my logic is weak, I need to know. Correct me clearly and explain why.

Maintain a constructive, but rigorous, approach. Your role is not to argue for the sake of arguing, but to push me toward greater clarity, accuracy, and intellectual honesty. If I ever start slipping into confirmation bias or unchecked assumptions, call it out directly. Let's refine not just our conclusions, but how we arrive at them.

--
Role: World-class context engineer instructions to ensure Claude Code (CC) behaves like a reliable junior developer under strict guidance.

Goal: For every issue, CC produces a single, self-contained doc that enables completion without reading anything else unless explicitly allowed.

1) Principles (Hard Guardrails)
Single-source context per issue. CC must rely only on the Issue PRD (created below). CC must not read other markdown/docs (e.g., README.md, broader PRDs, roadmaps) unless the Issue PRD explicitly whitelists exact paths.

Just-enough context. The PRD contains only what’s needed to implement the feature/bugfix: scope, constraints, acceptance criteria, I/O contracts, test plan, edge cases, code references/snippets. No background stories/future work.

No one-off scripts. All work lands in repo with code, tests, docs, and CI wiring.

Typed & tested. All changes include types, unit/integration tests, and migration/rollback steps where relevant.

Deterministic & auditable. Each step emits artifacts and a short report in the Issue PRD; outputs may be externally scored (reward/penalize) against the acceptance criteria.

2) Directory & File Conventions
/new-issues/                         # Issue-specific, single-source docs
  {ISSUE_SLUG}.PRD.md                # Authoritative spec for this issue ONLY
  {ISSUE_SLUG}.reports.md            # Agent reports & conclusions (append-only)

# Example code/doc touchpoints (controlled by the PRD)
src/...                              
tests/...
docs/...
Rule: CC may modify files only if explicitly listed in {ISSUE_SLUG}.PRD.md → Allowed Changes.
3) Workflow (MECE, Repeatable)


Phase A — Create the Issue PRD (single source of truth)


Command: /issue:new {ISSUE_SLUG}



Agent mix: research-synthesizer, context-manager, prompt-engineer

Inputs: The original issue text + repository code (read-only)

Output: /new-issues/{ISSUE_SLUG}.PRD.md — a standalone document with only the essentials:



Required PRD sections:

Problem & Goal (1 paragraph).

Scope / Non-Goals (bulleted).

Interfaces & Contracts

API routes (OpenAPI fragment) or function signatures

DTO/type definitions (TypeScript/JSON schema snippets)

Acceptance Criteria (testable, MECE).

Test Plan (unit + integration, named test cases).

Edge Cases & Error Handling.

Allowed Changes (explicit file paths; no others).

Telemetry (logs/metrics/traces to add).

Security & A11y Notes (input validation, authz, WCAG if UI).

Runtime & Review Commands (how to install, run, test).



Reviewer step (human): Manually tighten wording, resolve ambiguities with CC, and re-save the PRD. Keep it short and surgical.
Phase B — Implement via Closed-Context Chain


Command: /issue:implement {ISSUE_SLUG}



Chain (automatic, CC-coordinated):

a) Coder agent implements using only the PRD; no extra files.

b) Code evaluator & mentor agent runs tests, comments, and suggests changes (tests must pass).

c) Coder agent applies critical + medium feedback.

d) Documenter agent reads uncommitted changes and updates:

The Issue PRD (if any contract changed)

Minimal deltas in README.md/docs/ only if PRD permits

e) Coordinator agent summarizes outcomes and justifies that acceptance criteria are met.



Scoring note: Every agent is informed that actions are externally evaluated and rewarded/penalized based on strict adherence to the PRD.



Artifacts:

Code diffs in allowed paths

Tests added/updated and passing

Short per-agent reports appended to /new-issues/{ISSUE_SLUG}.reports.md

Phase C — Quick Owner Verification
Skim updated README.md changes (if any), run the test suite locally, and click through the UI like a user.

No deep review here—just sanity checks.

Phase D — PR Creation & Automated Review


Command: /issue:pr {ISSUE_SLUG}

Create branch & PR; assign labels, link to issue.

Trigger Claude Code + CodeRabbit PR reviews (focus on architecture & contracts).

Expect real improvement suggestions unless trivial.

Phase E — Apply PR Feedback & Re-evaluate


Command: /issue:apply-review {ISSUE_SLUG}

Pull all AI comments; implement necessary fixes.

Commit and push; re-request reviews.

Log a brief “fixes summary” to {ISSUE_SLUG}.reports.md.

Phase F — Merge & Close


Command: /issue:merge {ISSUE_SLUG}

99% of cases: squash-merge; delete branch.

Issue auto-closes with final status recorded in {ISSUE_SLUG}.reports.md.

4) Agent Prompts (Templates)


4.1 Issue PRD Author (closed-context)
SYSTEM: Create a SINGLE, self-contained PRD for {ISSUE_SLUG}. 
Use ONLY the issue text and current codebase for references.
Exclude background/roadmaps/adjacent tasks. 
Do NOT reference any other docs unless you inline the necessary excerpt here.
Output the exact sections 1–10 defined in the Playbook. 
Be precise and testable. Minimal code snippets are allowed ONLY for contracts (types, DTOs, API shapes).
4.2 Coder (implementation, closed-context)
SYSTEM: Implement ONLY what {ISSUE_SLUG}.PRD.md specifies. 
Modify ONLY files listed under "Allowed Changes". 
Write tests FIRST exactly as the PRD Test Plan states; then code to make tests pass. 
Follow types, contracts, a11y/security notes, and telemetry requirements. 
No extra features, no refactors outside scope.
4.3 Evaluator & Mentor (tests, feedback)
SYSTEM: Run tests, linters, type checks. 
Evaluate against Acceptance Criteria. 
Classify feedback as CRITICAL, MEDIUM, MINOR with clear diffs or code pointers. 
Require passing tests; block if contracts or security/a11y are violated.
4.4 Documenter (delta docs only)
SYSTEM: Update ONLY docs allowed in PRD.
If contracts changed, update the PRD accordingly (explicitly mark deltas).
No broad rewrites; keep edits surgical and scoped to the change.
4.5 Coordinator (completion justification)
SYSTEM: Verify that all Acceptance Criteria are met.
Summarize proofs: which tests cover which criteria, where telemetry/logs were added, and why risk is acceptable.
Append a concise conclusion to {ISSUE_SLUG}.reports.md.
5) Acceptance Gates (DoR / DoD)


Definition of Ready (DoR) for implementation

Issue PRD present and approved.

Allowed Changes explicit.

Contracts/types defined.

Test Plan concrete and runnable.



Definition of Done (DoD)

Tests added/updated and green (unit + integration where applicable).

Types/DTOs match contracts.

Security/a11y notes implemented.

Telemetry/log entries added as specified.

Only allowed files changed; CI green.

Coordinator justification recorded; PR reviews addressed.

6) Prohibitions (Common Failure Modes)
❌ Reading or citing any other markdown/doc unless whitelisted in PRD.

❌ Expanding scope (refactors, style sweeps, unrelated fixes).

❌ Creating throwaway scripts or files outside Allowed Changes.

❌ Skipping tests or types.

❌ Modifying CI/CD without explicit instruction.

❌ Silent “smart” improvements—stick to the PRD.

7) Minimal Helpful Snippets (Allowed)
Type/DTO examples (just enough to compile).

OpenAPI/GraphQL fragments for request/response shapes.

Example test case names with short Arrange/Act/Assert notes.

Config toggles/flags if needed (with default values).



Anything beyond the contracts/tests snippets should be implemented directly in code, not bloating the PRD.
8) Runtime Commands (to include in every PRD)
Install: exact commands (package manager + lockfile).

Run dev: FE/BE servers + required env.

Test: unit/integration; how to run subsets.

Migrate/Rollback: up/down commands (if applicable).

Smoke test: 1–2 commands or steps proving the happy path.

9) External Evaluation & Scoring


All agent actions and outputs may be externally scored against Acceptance Criteria and process adherence.

Consistent violations (scope creep, reading disallowed files, missing tests/types) will reduce trust and trigger stricter gating on future runs.

10) Why This Works
Context isolation avoids distraction and scope creep.

Closed-loop chain (code → evaluate → fix → document → justify) enforces quality.

Strict gates create deterministic outcomes suitable for junior-dev execution.

Short PRDs speed review while keeping requirements testable.

Paste this file into your repo as ISSUE_EXECUTION_PLAYBOOK.md.
For each new task, start with Phase A to generate a tight Issue PRD, then run the closed-context chain.

-- 

ALWAYS FOLLOW GIT BEST PRACTICES: 

## Git & PR Workflow (SWE Best Practices — Appendable Section)

> **Purpose:** Give Claude Code (and humans) a deterministic, repeatable Git workflow for every feature/bugfix.
> **Rules:** No direct commits to `main`. Every change lives on a short-lived branch, gated by CI, code review, and clear rollback.

---

### 1) Branching Strategy (MECE)

* **Branch types (Conventional Commits scopes):**

  * `feat/<scope>-<slug>-#<issue>` – new user-visible functionality
  * `fix/<scope>-<slug>-#<issue>` – bug fixes
  * `refactor/<scope>-<slug>-#<issue>` – non-behavioral code changes
  * `perf/<scope>-<slug>-#<issue>` – performance improvements
  * `docs/<scope>-<slug>-#<issue>` – documentation only
  * `chore/<scope>-<slug>-#<issue>` – tooling, deps, CI, no product code
* **Examples:**
  `feat/alerts-subscriber-activation-#123`
  `fix/etl-usnews-parser-zip-normalization-#412`

---

### 2) Local Setup & Sync

```bash
git fetch --all --prune
git checkout main
git pull --ff-only origin main
# create a new branch
BRANCH="feat/alerts-subscriber-activation-#123"
git checkout -b "$BRANCH"
```

> **Principle:** Always start from a fresh `main` and **fast-forward only**.

---

### 3) Commit Discipline (Conventional Commits)

* **Format:** `type(scope): summary`
  Types: `feat|fix|docs|style|refactor|perf|test|chore|build|ci`
* **Good examples:**

  * `feat(alerts): enable subscriber activation + async watcher start (closes #123)`
  * `fix(ingest): guard against missing rank range in USNews (#412)`
* **Guidelines:**

  * Small, atomic commits; each passes tests locally.
  * Include rationale in body, reference issue IDs, and **migration/rollback notes if relevant**.
  * Never commit secrets; `.env*` and credentials remain ignored.

---

### 4) Pre-Commit Quality Gates (run locally)

```bash
# typical composite target; adapt to repo
make check \
 && make test \
 && make typecheck \
 && make lint \
 && make migrate:dryrun
```

> **Minimum bar:** Tests green, types clean, lints pass, migrations reviewed with rollback steps documented.

---

### 5) Rebase Hygiene (keep branch current)

```bash
git fetch origin
git rebase origin/main
# resolve conflicts, run tests again
make check && make test
# if needed:
git rebase --continue
```

> **Policy:** Prefer **rebase over merge** on feature branches to keep history linear and reviewable.

---

### 6) Push & Open PR

```bash
git push -u origin "$BRANCH"
```

**PR title:** mirror your best commit subject.
**PR description (template):**

* **What & Why:** one paragraph linking the SPEC/issue
* **Scope:** files, modules, user-visible changes
* **Risk/Migrations:** forward/backward steps, rollout plan
* **Testing Evidence:** unit/integration results, screenshots as needed
* **Performance/SLI impact:** expected P95, cache changes
* **Security/Compliance:** data handling, FH/PII considerations

**Required gates before merge:**

* CI: lint, typecheck, tests, migrations, schema checks
* Coverage: ≥ agreed threshold (e.g., 80%+ on changed lines)
* **2 approvals** (code owners where relevant)

---

### 7) Review Etiquette

* **Authors:** respond to each comment; prefer follow-up commits over force-push unless rebasing; keep PR small.
* **Reviewers:** focus on correctness, security, data contracts, and performance; propose concrete changes.
* **Claude Code:** may propose diffs but **human approval is mandatory**.

---

### 8) Merge Strategy & Post-Merge

* **Default:** **Squash & Merge** to keep `main` clean and enable single-commit rollback.
* **When to “Rebase & Merge”:** shared feature branches with granular commit history required.
* **After merge:**

  ```bash
  git checkout main
  git pull --ff-only origin main
  git branch -d "$BRANCH"
  git push origin --delete "$BRANCH"
  ```
* **Tag & Release (if user-visible or deployable):**

  * Semantic Versioning: `vMAJOR.MINOR.PATCH`
  * Auto-generate CHANGELOG from Conventional Commits (e.g., `git-cliff`/`standard-version`)
  * Annotated tag:

    ```bash
    VERSION="v1.12.0"
    git tag -a "$VERSION" -m "Release $VERSION: alerts subscriber activation"
    git push origin "$VERSION"
    ```

---

### 9) Hotfix Protocol (production breakage)

```bash
git checkout -b fix/hotfix-<slug>-#<issue> origin/main
# minimal, surgical change + tests
make check && make test
git push -u origin fix/hotfix-<slug>-#<issue>
# fast-track PR: 1 owner + 1 engineer approval, CI green
# post-merge: tag PATCH release (e.g., v1.12.1), announce in release notes
```

---

### 10) Migrations & Rollbacks (zero-downtime)

* **Forward:** add columns/tables with defaults → dual-write if needed → deploy code reading new shape.
* **Backward:** keep old paths for one deploy cycle → remove only after verification.
* **Document** both in PR body. Include `migrate:up` / `migrate:down` commands.

---

### 11) Large Files, Secrets, & Binary Artifacts

* **Git LFS** for files >10 MB (maps/images if necessary).
* **Never** commit secrets. Use `.env.local` + secret manager (SOPS, AWS SM).
* Generated assets (PDFs, Parquet) live in object storage, **not** in Git.

---

### 12) Useful Recovery Commands

```bash
# undo last commit but keep changes staged
git reset --soft HEAD~1

# discard local changes to a file
git restore --source=HEAD -- path/to/file

# find lost commits
git reflog

# revert a bad commit on main
git revert <sha>

# abort a rebase/merge
git rebase --abort
git merge --abort
```

---

### 13) Hooks & Automation

* **Pre-commit:** formatters, linters, secret scanners (`pre-commit`, Husky).
* **Pre-push:** run fast test subset or schema checks.
* **CI:** repeat local gates; block merges on failures; publish artifacts (coverage, docs).

---

### 14) Claude Command — “Git Feature Flow” (for inclusion in command .md)

```
/git-feature-flow "<issue_title>" "<issue_id>" "<scope>" "<slug>"
1) Create branch: {type from issue labels}:{scope}-{slug}-#{issue_id}
2) Read SPEC/PRD for this issue ONLY; do not modify unrelated files.
3) Implement in small commits (Conventional Commits). Each commit must pass: lint, typecheck, unit tests.
4) Rebase on origin/main before pushing.
5) Open PR with the standard template; attach test evidence and migration/rollback steps.
6) Wait for CI + 2 approvals; address feedback via commits (no force-push unless rebase).
7) Squash & Merge; delete branch; tag release if user-visible; update CHANGELOG automatically.
8) Report back with PR link, tag, and release notes summary.
```

---

### 15) Do / Don’t

* ✅ Do keep PRs < 400 lines of diff when possible; split otherwise.
* ✅ Do reference issues and SPEC sections; keep changes scoped.
* ❌ Don’t push to `main`.
* ❌ Don’t bypass CI or skip tests.
* ❌ Don’t commit secrets, large binaries, or environment-specific configs.

---




