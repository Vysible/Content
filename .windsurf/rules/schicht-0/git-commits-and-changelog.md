---
trigger: always_on
description: "Commit discipline invariants: CHANGELOG in same commit, no silent changes, user-facing entries."
---

# This file contains only the invariants of Forge commit discipline.
# It is alwaysApply: true because these rules hold in every context.
# Commit-type vocabulary, CHANGELOG procedure, pre-commit checklists,
# and tag/release flow live in: schicht-2/git-commits-conventions.mdc

# Git Commits and Changelog — Invariants

## Hard Rules

These five rules apply to every commit on protected branches
(`main`, `release/*`). No exceptions.

1. **`CHANGELOG.md` is updated in the same commit** as the change it
   describes — never as a follow-up commit. If staged files contain
   changes under source paths, `CHANGELOG.md` MUST also be staged with
   at least one new line under `## [Unreleased]`.
2. **Pre-commit checks come first.** If any check fails: STOP, fix the
   issue, then retry. See `git-commits-conventions.mdc` for the checklist.
3. **CHANGELOG entries are user-facing**, not raw commit-message copies.
   Translate technical changes into operator-readable lines.
4. **Internal-only refactorings without user-visible effect get NO
   CHANGELOG entry.** If a change touches many files but operators
   perceive nothing new, write one summary bullet under `Changed`,
   not one per file.
5. **Never commit on behalf of the user without an explicit request.**
   This rule defines *how* to commit, not *whether*.
