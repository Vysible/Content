---
trigger: always_on
description: "How to interpret and respond to command results — prevents silent stalls after tool-call clusters."
---

# Command Result Interpretation

## Scope

Applies whenever tool-calls (run_command, command_status) return results.

## Hard Rules

### 1. Always Respond After Tool-Call Clusters

After every group of tool-calls completes — regardless of outcome — produce
a status message. Never leave tool results as the last item in the conversation.

When results are mixed or ambiguous, the response MUST contain:
- Status of each command (PASS / FAIL / INCONCLUSIVE)
- Clear next-step proposal or explicit question to the user

### 2. Cancelled Commands = INCONCLUSIVE

When a command shows `Step was canceled by user`:
- Do NOT treat as PASS.
- Do NOT silently skip it.
- Report: `[INCONCLUSIVE] Check [X] — cancelled by user`
- Ask whether to retry, skip, or abort.

### 2a. INCONCLUSIVE = Sofortiger Report, kein weiterer Tool-Call

**INCONCLUSIVE ist ein vollständiger Stopp-Zustand für den laufenden Batch.**

Wenn auch nur ein Ergebnis INCONCLUSIVE ist:
1. **SOFORT** eine sichtbare Status-Antwort produzieren — vor jedem weiteren Tool-Call.
2. Den Status aller Commands im Batch auflisten (PASS / FAIL / INCONCLUSIVE).
3. Den User explizit fragen: retry / skip / abort.
4. **Kein weiterer Tool-Call, kein weiteres Kommando** bis der User antwortet.

**Keine Ausnahme.** Auch wenn die anderen Commands im Batch PASS waren.
Auch wenn INCONCLUSIVE "wahrscheinlich harmlos" wirkt.
Entscheidungsparalyse (= Null-Output nach Tool-Calls) ist ein Regelverstoß.

### 3. PowerShell Select-String: No Output = Pattern Not Found

`Select-String` returns exit code 0 even when no match is found (unlike grep).
**No output = pattern NOT found.** Always interpret as:

```
[WARN] Pattern "<pattern>" nicht gefunden in <Datei>
```

Never interpret exit 0 + no output as PASS for any validation check.

Before running `Select-String` on a specific file, verify the file exists:
`Test-Path <file>` — if false, skip the check and report the file as missing.

### 4. Known Long-Running Commands — Non-Blocking

These commands MUST be run with `Blocking: false` + `WaitMsBeforeAsync: 5000`:

- `pnpm test` / `pnpm test --run`
- `pnpm build`
- `playwright test`
- `prisma migrate deploy`

Commands that are fast and whose output determines the next step (e.g. `tsc --noEmit`,
`git status`, `Select-String`) remain `Blocking: true`.

### 5. Pre-Slice / Pre-Sprint Validations — Sequentielle Batches

Validations-Checks (Pre-Slice, Pre-Sprint, Sprint-Closeout) werden in **kleinen sequentiellen Batches** ausgeführt — nicht alle auf einmal.

**Maximale Batch-Größe: 2–3 Commands.**

Nach jedem Batch:
1. Status aller Commands ausgeben (PASS / FAIL / INCONCLUSIVE).
2. Bei FAIL oder INCONCLUSIVE: STOP, User fragen — kein nächster Batch.
3. Bei alle PASS: nächsten Batch starten.

**Begründung:** Viele parallele Results gleichzeitig verarbeiten erhöht die Wahrscheinlichkeit
von Entscheidungsparalyse (Null-Output). Sequentielle Batches reduzieren dieses Risiko
strukturell — unabhängig von der Gesamt-Anzahl der Checks.

**Ausnahme:** Wirklich unabhängige, nicht-validierende Tasks (z.B. forge-web-Änderung
während Tests laufen) dürfen weiterhin parallel ausgeführt werden.
