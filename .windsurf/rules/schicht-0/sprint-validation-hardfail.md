---
trigger: always_on
description: "Sprint validation: HARD-FAIL stops all further action immediately. No exceptions."
---

# Sprint Validation — Hard-FAIL Behaviour

## Scope

Applies to all sprint-prompt execution (`docs/dev-prompts/sprint-*.md`).

## Hard Rule

When any Pre-Slice Validation check is marked **Hard-FAIL**, the following behaviour is mandatory — no exceptions:

1. **STOP immediately.** No further commands. No parallel checks. No "let me also run X to give a complete picture."
2. **Output exactly:**
   ```
   HARD-FAIL: Check [X] — [Grund]
   Erforderliche Aktion: [was der User tun muss]
   ```
3. **Await explicit user instruction.** Do not proceed until the user explicitly says to continue.

## Verbotene Patterns bei Hard-FAIL

- Weitere Checks nach Hard-FAIL starten
- Parallel-Commands abfeuern um "ein vollständiges Bild zu geben"
- Hard-FAIL als "wahrscheinlich okay, ich verifiziere kurz" interpretieren
- Eigenständig entscheiden ob der Hard-FAIL relevant genug ist um zu stoppen
