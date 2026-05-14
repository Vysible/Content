# Entwicklungsprompts (Vibe-Coding)

Dieser Ordner enthält Cursor/Windsurf-Prompts für die Weiterentwicklung von Vysible.

**Abgrenzung zu `/prompts/`:**
- `/prompts/*.yaml` → operative KI-Prompts, die zur Laufzeit geladen werden (nie anfassen ohne Deployment-Test)
- `docs/dev-prompts/*.md` → Entwicklerprompts für den nächsten Coding-Sprint (Vibe-Coding)

## Namenskonvention

```
sprint-0-stabilisierung.md     Sprint-Prompts
slice-28-compliance.md         Feature-Slice-Prompts
fix-hwg-gate.md                Bugfix-Prompts
```

## Kontext-Header (immer am Anfang eines neuen Chats einfügen)

```
Lies zuerst: AGENTS.md, docs/architecture.md, docs/roadmap.md, docs/decisions.md
Forge-Regeln in .cursor/rules/ sind verbindlich.
Aktueller Stand: Sprint 0 abgeschlossen. Nächste Priorität: Sprint 1 (Slice 28 Compliance).
```
