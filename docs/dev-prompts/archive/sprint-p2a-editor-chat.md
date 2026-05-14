# Sprint P2-A — Text-Editor + Chat & Versionen (Slice 6 + 8)

**Projekt:** Vysible  
**Sprint:** P2-A  
**Format:** Tier 2 — Scope-Karte (Ist-Stand zuerst erkunden)  
**Abhängigkeit:** Phase-1-Restarbeiten ✅  
**Anforderungen:** FA-F-21 (Inline-Editing), FA-F-22 (Autosave), FA-F-23 (Chat), FA-F-24 (Versionen)  
**Geschätzte Dauer:** ~2–3 Tage

> **Warum Tier-2?** Editor und Chat sind zu ~80% implementiert. Der Agent muss
> den tatsächlichen Ist-Stand erkunden, bevor er die konkreten Lücken schließt.
> Präzise Snippets jetzt wären falsche Präzision.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain
# Erwartet: leere Ausgabe

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit
# Erwartet: 0 Fehler

# Check C — Roadmap
Select-String "Phase-1-Restarbeiten.*abgeschlossen|Phase-1-Restarbeiten.*✅" docs/roadmap.md -i
# Erwartet: Treffer

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
# Erwartet: Treffer
```

Bei **Hard-FAIL (A oder B):** STOP.  
Bei **4/4 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

**Vor jedem Sub-Slice:** Ist-Stand erkunden, nicht blind implementieren.

```powershell
# Slice 6 — Editor-Infrastruktur
Get-Content components/editor/EditorView.tsx
Get-Content components/editor/RichTextEditor.tsx
Get-Content components/results/ResultsTabs.tsx | Select-String "autosave|catch|saving" -i -A 3

# Slice 8 — Chat + Versionen
Get-Content components/editor/ChatPanel.tsx
Get-Content app/api/projects/[id]/chat/route.ts
Select-String "version|ContentVersion" lib/generation/results-store.ts -i -A 2
```

**Bekannte Lücken (Stand Mai 2026, aus Code-Review):**

| Datei | Lücke | Forge-Regel |
|---|---|---|
| `EditorView.tsx` L41 | `catch {}` nur `setSaveState('error')` — kein Log | `resilience §3a` |
| `ResultsTabs.tsx` autosave L47–57 | `try/finally` ohne `catch` — API-Fehler still geschluckt | `resilience §3a` |
| `ChatPanel.tsx` L50–52 | `catch(err)` setzt nur `setError()` — kein `logger.error()` | `resilience §3a` |
| `ChatPanel.tsx` | Header zeigt nur "KI-Überarbeitung" — kein Artikel-Kontext | plan §Slice 8 |
| `ChatPanel.tsx` | Kein sichtbarer Konversationsverlauf (gesendete + empfangene Nachrichten) | plan §Slice 8 |
| `SharePanel.tsx` L27 | `.catch(() => {})` — stiller Catch | `resilience §3a` |

**Drift-Report:** Kurz zusammenfassen was tatsächlich vorhanden ist vs. was oben als fehlend steht.

---

## CRITICAL: Self-review Checklist (Sprint-übergreifend)

- [ ] Jedes Sub-Slice einzeln committed (kein Mega-Commit)
- [ ] `logger.*` aus `lib/utils/logger.ts` statt `console.*`
- [ ] Kein neues `catch {}` ohne Log — Forge `resilience §3a`
- [ ] TypeScript strict: 0 Fehler nach jedem Sub-Slice
- [ ] Tests: bestehende Vitest-Suite läuft durch — kein Regression
- [ ] CHANGELOG.md im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Editor Resilience + Autosave (Slice 6 abschliessen)

**Aufwand:** ~0,5 Tage  
**Scope:** Bestehende Autosave-Kette korrekt machen. Keine neuen Features.

### IN

```
components/editor/EditorView.tsx     MOD — catch-Block loggen + SaveState korrekt
components/results/ResultsTabs.tsx   MOD — autosave-Fehler loggen (catch ergänzen)
components/results/SharePanel.tsx    MOD — .catch(() => {}) → logger.warn(...)
```

### OUT

```
RichTextEditor.tsx                   NICHT anfassen (Tiptap-Setup ist korrekt)
ResultsTabs UI-Logik                 NICHT anfassen (Tabs, Sort, Status-Select)
```

### Was zu tun ist

1. **`EditorView.tsx` — Silent Catch reparieren**

   ```typescript
   // VORHER (L41):
   } catch {
     setSaveState('error')
   }

   // NACHHER:
   } catch (err: unknown) {
     logger.error('[Vysible] Autosave fehlgeschlagen:', err)
     setSaveState('error')
   }
   ```

2. **`ResultsTabs.tsx` — `autosave` catch ergänzen**

   Die `setTimeout`-Callback in `autosave` hat nur `try/finally`. Fetch-Fehler
   werden still geschluckt. `catch` ergänzen und `logger.warn` aufrufen.

3. **`SharePanel.tsx` — Stiller Catch reparieren**

   ```typescript
   // VORHER (L27):
   .catch(() => {})

   // NACHHER:
   .catch((err: unknown) => {
     logger.warn('[Vysible] Share-Links konnten nicht geladen werden:', err)
   })
   ```

4. **Autosave-Timing prüfen:** `EditorView.handleChange` ruft `onUpdate(updates)` auf, setzt
   dann `setSaveState('saved')` — aber `onUpdate` ist `void`, nicht awaited. Nach der Fix
   prüfen: Zeigt der `SaveIndicator` 'saved' erst wenn der API-Call in `ResultsTabs.autosave`
   abgeschlossen ist? Falls nein: entweder `onUpdate` zu `Promise<void>` machen oder
   den `SaveIndicator` aus `ResultsTabs` steuern (nicht aus `EditorView`).
   **Entscheidung dokumentieren.**

### Acceptance Checklist

- [ ] Editor-Änderung → `SaveIndicator` zeigt "Speichert…" → "Gespeichert" nur nach erfolgreicher API-Antwort
- [ ] API-Fehler beim Autosave → "Fehler beim Speichern" + log-Eintrag sichtbar
- [ ] Share-Links laden fehlgeschlagen → `logger.warn` statt stiller Catch
- [ ] TypeScript: 0 Fehler
- [ ] Kein neuer `console.*`

### Commit-Message

```
fix(editor): Autosave-Resilience — stille Catches geloggt, SaveIndicator-Timing korrigiert (Slice 6)
```

---

## Sub-Slice B — Chat Kontext-Binding + Verlauf (Slice 8 abschliessen)

**Aufwand:** ~1,5–2 Tage  
**Scope:** Chat-Panel um sichtbaren Gesprächsverlauf und Artikel-Kontext erweitern.

### IN

```
components/editor/ChatPanel.tsx      MOD — Konversationsverlauf, Kontext-Header, logger
app/api/projects/[id]/chat/route.ts  PRÜFEN — kein direktes Anfassen wenn nicht nötig
lib/generation/results-store.ts      PRÜFEN — ContentVersion-Typ prüfen
```

### OUT

```
RichTextEditor.tsx                   NICHT anfassen
app/api/projects/[id]/chat/route.ts  NUR anfassen wenn Typ-Anpassung nötig
```

### Was fehlt

**Lücke 1 — Kontext-Header (Kontext-Binding)**

Der Chat-Header zeigt aktuell nur "KI-Überarbeitung". Laut plan.md:
> "Kontext-Binding: aktives Artefakt als Header injiziert"

Das `ChatPanel` bekommt via Props `versionField` ('blog' | 'newsletter'). Es gibt
aber keinen Artikel-Titel. `EditorView` bekommt den Titel nicht übergeben.

Lösung: `EditorView` Props um optionalen `title?: string` erweitern, an `ChatPanel`
weitergeben. Im ChatPanel-Header: `"KI-Überarbeitung: {title ?? versionField}"`.

Exploration zuerst: `Select-String "titel|title" components/editor/EditorView.tsx`

**Lücke 2 — Sichtbarer Konversationsverlauf**

Aktuell: Nutzer sendet Chip oder Text → Inhalt wird überarbeitet → kein sichtbarer
Verlauf. Plan: Split-View mit Chat-Verlauf rechts.

Zu implementieren: `ChatMessage`-State in `ChatPanel` — jede Interaktion
wird als Message-Paar (User-Anfrage + KI-Antwort-Vorschau) gespeichert und
als scrollbarer Thread angezeigt.

```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  text: string       // Bei 'user': Chip-Label oder Freitext
                     // Bei 'assistant': erste 80 Zeichen des überarbeiteten Texts
  timestamp: string  // ISO-String
}
```

Der Thread ist clientseitig (keine DB-Persistenz). Wird bei Versionswiederherstellung
mit einem Marker ergänzt: `"Version X wiederhergestellt"`.

**Lücke 3 — Logger statt setError-only**

```typescript
// VORHER catch in send():
} catch (err) {
  setError(err instanceof Error ? err.message : 'Fehler')
}

// NACHHER:
} catch (err: unknown) {
  logger.error('[Vysible] Chat-Überarbeitung fehlgeschlagen:', err)
  setError(err instanceof Error ? err.message : 'Fehler')
}
```

### Acceptance Checklist

- [ ] ChatPanel-Header zeigt Artikel-Titel (z.B. "KI-Überarbeitung: Implantate in Warendorf")
- [ ] Chip-Klick → Message "Kürzer" + KI-Antwort-Vorschau (80 Zeichen) erscheint im Thread
- [ ] Freitext senden → eigene Nachricht + KI-Antwort im Thread
- [ ] Versionswiederherstellung → Marker "Version 2 wiederhergestellt" im Thread
- [ ] Thread scrollbar, neueste Nachricht unten
- [ ] Fehler: `logger.error` + `setError` angezeigt
- [ ] TypeScript: 0 Fehler
- [ ] `RichTextEditor` unverändert (Snapshot-Test)

### Commit-Message

```
feat(chat): Kontext-Header + Konversationsverlauf + Logger-Resilience (Slice 8)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Keine neuen console.* in components/ und lib/
Select-String "console\.(log|warn|error)" components,lib -Recurse |
  Where-Object { $_.Path -notmatch "scripts/" }
# → Zero Treffer

# Keine neuen stillen Catches
Select-String "catch\s*\(\w+\)\s*\{\s*\}" components,lib -Recurse
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components,lib -Recurse
# → Zero Treffer

# Tests grün
pnpm test
# → Alle PASS
```

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P2-A ABSCHLUSSBERICHT
=============================

Sprint: P2-A — Editor + Chat & Versionen

SUB-SLICES:
  A Editor Resilience + Autosave:  [ ] DONE — Commit: <hash>
  B Chat Kontext-Binding + Verlauf:[ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>

CHECKS:
  TypeScript 0 Fehler:    [ ]
  Alle Tests grün:        [ ] x/x PASS
  Keine console.*:        [ ]
  Keine stillen Catches:  [ ]
  CHANGELOG aktuell:      [ ]

═══════════════════════════════════════════════
[OK] P2-A ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P2-B (Kalender + Kunden-Sharing)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2a-editor-chat.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
