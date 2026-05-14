---
trigger: always_on
description: "Each significant component has an explicitly documented owner. Supports solo, small-team, and larger-team ownership models."
---

# Component Ownership

## Scope

Applies to all significant components: modules, services, subsystems, and external adapters. Utility helpers, private implementation details, and clearly experimental spikes do not require ownership documentation.

---

## Rule

### Owner Definition per Component

Every significant component has an **explicitly documented** owner. Implicit ownership ("whoever wrote it last" or "we all own it") is not valid.

Valid documentation locations — projects choose one and apply it consistently:

| Model | Location | Best for |
|-------|----------|----------|
| **Structured doc** | `docs/component-ownership.md` | Any project size; human-readable |
| **GitHub CODEOWNERS** | `CODEOWNERS` at repo root | Teams; auto-assigns PRs for review |
| **Module header comment** | `# Owner: <name/team>` in file header | Very small projects with few files |

**Default when undocumented:** The repository maintainer is the implicit owner. This default exists to avoid paralysis, not as a substitute for documentation — it should be made explicit as soon as the project has more than one contributor.

### Single Owner per Component

Each component has **one** owner. Multiple owners = no owner.

- When multiple people contribute to a component, one of them is designated owner and is responsible for architecture decisions, reviews, and direction.
- This does not mean the owner writes all changes — it means the owner must know about and approve them.
- When ownership transfers (personnel change, team restructure), the transfer must be documented explicitly — not inferred from `git blame`.

### Mutation Authority

Shared state (databases, external APIs, shared caches, configuration stores) is modified **only by the component designated as its owner**.

- Other components read from or call into the owner component.
- "Implicit shared mutation" — multiple components writing to the same database table or cache key without a designated owner — is an architecture smell.
- When a new component needs to write to existing shared state, the correct action is: coordinate with the state owner, not write directly.

### Owner Responsibilities

The owner of a component is responsible for:

- Architecture of the component and its internal structure
- Review and approval of changes (not necessarily authoring them)
- Test coverage and quality of the component
- Keeping the component's documentation current

The owner is **not** required to author every change. They are required to be aware of and accountable for the component's state.

### Solo-Developer Special Case

In single-developer projects, the maintainer owns all components. This is a valid and common starting state.

However: it must be **explicitly stated** in `docs/component-ownership.md` (even as a single line: *"All components: [maintainer name]"*). Implicit solo ownership is not acceptable.

As soon as a second person gains meaningful access (contributor, collaborator, team member), the ownership list must be differentiated by component. The default "maintainer owns everything" no longer applies once the team grows.

---

## Rationale

Unclear ownership leads to three failure modes:

1. **Orphaned components** — nobody feels responsible, quality decays, documentation goes stale.
2. **Diffuse accountability** — when something breaks, nobody owns the fix; every developer points to another.
3. **Contradictory architectural decisions** — without a designated owner, two developers make incompatible changes to the same subsystem independently.

Explicit ownership converts these from organizational problems into process violations: if an undocumented owner makes an architectural change, the violation is visible and correctable. Without explicit ownership, it is invisible.

---

## Ownership Models (All Three Supported)

### Model A — Solo Developer

```markdown
# docs/component-ownership.md

All components: @maintainer-username
(package.json: version managed by maintainer)
```

Simple, valid, explicit. Must be updated when a second contributor joins.

### Model B — Small Team (docs-based)

```markdown
# docs/component-ownership.md

| Component | Owner | Notes |
|-----------|-------|-------|
| `src/api/` | @alice | FastAPI routes and schemas |
| `src/pipeline/` | @bob | Data processing pipeline |
| `src/db/` | @alice | Database adapters and migrations |
| `src/auth/` | @charlie | Authentication and authorization |
```

Human-readable, easy to update, works for teams of 2–8.

### Model C — Larger Team (CODEOWNERS)

```
# CODEOWNERS

/src/api/           @org/team-api
/src/pipeline/      @org/team-data
/src/db/            @alice
/src/auth/          @org/team-security
```

GitHub auto-assigns reviewers on PRs. Scales to any team size.

---

## Examples

### ✅ Correct: explicit CODEOWNERS with automatic PR assignment

```
# CODEOWNERS
/src/scraper/   @maintainer
/src/storage/   @maintainer
/src/api/       @maintainer
```

New PR touching `src/scraper/` automatically requests review from `@maintainer`. Ownership is enforced by the platform.

### ✅ Correct: explicit solo ownership in docs

```markdown
# docs/component-ownership.md
All components are owned by the repository maintainer (@maintainer).
Last reviewed: 2025-03-01.
```

### ❌ Incorrect: implicit collective ownership

Two developers merge into `src/pipeline/` without coordination. One adds a new abstraction layer; the other refactors the existing one. Both changes are incompatible. Neither asked the other because "we both work on pipeline." Architecture drifts; integration breaks.

### ❌ Incorrect: ownership by git blame

```
Q: "Who owns the auth module?"
A: "Check git blame, probably whoever wrote it last."
```

`git blame` is not ownership documentation. It shows history, not responsibility.

---

## Anti-Patterns

| Anti-pattern | Why it fails |
|-------------|-------------|
| "Whoever wrote it last owns it" | Ownership changes silently with every commit |
| "We all own everything" | No one is accountable; decisions are made by whoever acts last |
| "Check git blame to find the owner" | History ≠ responsibility |
| Multiple components mutating the same state without a designated owner | Leads to data consistency bugs and uncoordinated schema changes |

---

## Enforcement

Code review plus optional `CODEOWNERS` automation (GitHub). No automated CI check — ownership is a social and organizational discipline, not a code pattern.

Reviewers should ask:
- Is the component being changed owned by someone on this PR?
- If the PR introduces a new significant component, is ownership documented?
- If the PR modifies shared state, has the state owner been consulted?

---

## Exceptions

The following do **not** require ownership documentation:

- Utility helpers that are used across the codebase with no clear subsystem home
- Private implementation details (underscore-prefixed, not exported)
- Experimental spikes or prototypes clearly marked as temporary

---

## History / Discovered In

This rule originates from AlgoTrader's Ownership & Responsibility Rule, which mandated that all ownership assignments be defined in a single authoritative document. The trading-domain specifics were stripped. The core principles — explicit over implicit ownership, single owner per component, mutation authority, and ownership transfer protocol — are universally applicable.

The multi-model design (solo / small team / larger team) is a Forge-specific generalization: AlgoTrader's single-document model works for a solo-developer TypeScript project, but Forge must support the full range of team sizes a framework consumer may have. In TypeScript projects, component boundaries typically map to `src/` subdirectories, with ownership documented in `docs/component-ownership.md` or via `CODEOWNERS`.
