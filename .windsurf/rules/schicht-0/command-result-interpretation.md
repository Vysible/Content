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
