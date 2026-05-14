# Sprint P2-B — Kalender + Kunden-Sharing (Slice 7 + 10)

**Projekt:** Vysible  
**Sprint:** P2-B  
**Format:** Tier 2 — Scope-Karte (Ist-Stand zuerst erkunden)  
**Abhängigkeit:** Sprint P2-A ✅  
**Anforderungen:** FA-F-25 (Kalender), FA-F-26 (Sharing/Freigabelink)  
**Geschätzte Dauer:** ~2 Tage

> **Warum Tier-2?** Kalender und Sharing sind zu ~70–80% implementiert.
> Der Agent erkundet den Ist-Stand, bevor er die konkreten Lücken schließt.

---

## EXECUTE FIRST — Pre-Slice Validation (Pflicht)

Lies `docs/dev-prompts/Pre_Slice_Validation.md` vollständig und führe die 4 Checks aus:

```powershell
# Check A — Working Tree
git status --porcelain

# Check B — TypeScript
node node_modules/typescript/bin/tsc --noEmit

# Check C — Roadmap
Select-String "P2-A.*abgeschlossen|P2-A.*✅|Sprint P2-A.*✅" docs/roadmap.md -i

# Check D — CHANGELOG
Select-String "\[Unreleased\]" CHANGELOG.md
```

Bei **Hard-FAIL (A oder B):** STOP.  
Bei **4/4 PASS:** Exploration starten.

---

## CRITICAL: Exploration zuerst

```powershell
# Slice 7 — Kalender
Get-Content components/calendar/ContentCalendar.tsx
Get-Content app/(dashboard)/projects/[id]/calendar/page.tsx

# Slice 10 — Sharing
Get-Content components/results/SharePanel.tsx
Get-Content app/share/[token]/ShareAccess.tsx
Get-Content app/api/projects/[id]/share/route.ts
Get-Content app/api/share/[token]/verify/route.ts

# Status-Felder in StoredTextResult
Select-String "blogStatus|newsletterStatus|socialStatus|wpStatus|ktStatus" lib/generation/results-store.ts -i -A 2
```

**Bekannte Lücken (Stand Mai 2026, aus Code-Review):**

| Datei | Lücke | Forge-Regel / Plan |
|---|---|---|
| `ContentCalendar.tsx` `handleDrop` | `try/finally { setSaving(false) }` ohne catch — API-Fehler still geschluckt | `resilience §3a` |
| `ContentCalendar.tsx` | WP-Status + KT-Status nicht separat farbcodiert — nur `blogStatus/newsletterStatus/socialStatus` | plan §Slice 7 |
| `ShareAccess.tsx` | Zeigt nur Themen + Blog — Newsletter und Social fehlen komplett | plan §Slice 10 |
| `SharePanel.tsx` L27 | `.catch(() => {})` — stiller Catch (falls von P2-A noch offen) | `resilience §3a` |

**Drift-Report:** Kurz zusammenfassen was tatsächlich vorhanden ist vs. was oben als fehlend steht.
Besonders: Welche Status-Felder existieren im `StoredTextResult`-Typ für WP und KT?

---

## CRITICAL: Self-review Checklist

- [ ] Jedes Sub-Slice einzeln committed (kein Mega-Commit)
- [ ] Logger: `logger.*` aus `lib/utils/logger.ts` in Server-Code (`lib/`, `app/api/`);
      `console.warn/error('[Vysible] …', err)` in Client-Components (`'use client'`).
      Hintergrund: pino-pretty ist server-only — siehe `docs/forge-web-deviations.md`
      "Client-Component-Logger" und `OpenActions.md` Backlog-Punkt 2.
- [ ] Kein neues `catch {}` ohne Log — Forge `resilience §3a`
- [ ] TypeScript strict: 0 Fehler nach jedem Sub-Slice
- [ ] Tests grün — kein Regression
- [ ] CHANGELOG im jeweiligen Commit aktualisiert

---

## Sub-Slice A — Kalender Resilience + WP/KT-Status (Slice 7 abschliessen)

**Aufwand:** ~1 Tag

### IN

```
components/calendar/ContentCalendar.tsx   MOD — Resilience, WP/KT-Farbcodierung
```

### OUT

```
app/(dashboard)/projects/[id]/calendar/page.tsx   NICHT anfassen (Routing korrekt)
app/api/projects/[id]/results/route.ts            NICHT anfassen
StoredTextResult-Schema                           NICHT anfassen
```

### Was zu tun ist

**1. Resilience — Stiller Catch in `handleDrop` reparieren**

```typescript
// VORHER (handleDrop):
} finally {
  setSaving(false)
}

// NACHHER:
} catch (err: unknown) {
  // Client-Component → console.* mit '[Vysible]'-Prefix (lib/utils/logger.ts ist server-only)
  console.error('[Vysible] Kalender-Verschiebung konnte nicht gespeichert werden:', err)
  // Rollback: ursprünglichen Zustand wiederherstellen
  setItems(items) // items = Zustand vor der Änderung
} finally {
  setSaving(false)
}
```

Wichtig: Beim Fehler auch das UI zurückrollen (optimistisches Update rückgängig machen),
da der Nutzer sonst einen falschen Zustand sieht.

**2. WP-Status + KT-Status in Kalender farbcodieren**

Plan.md §Slice 7:
> "WP-Status + KT-Status ebenfalls farbcodiert"

Aktuell: `ContentCalendar` zeigt nur einen Status pro Item (`blogStatus ?? newsletterStatus ?? socialStatus`).

Exploration: Welche Status-Felder existieren? Prüfe `lib/generation/results-store.ts` auf
`wpDraftStatus` / `ktStatus` / ähnliche Felder.

Falls diese Felder im `StoredTextResult`-Typ noch nicht existieren: **NICHT hinzufügen** —
das ist Scope von Slice 22 (WordPress) und Slice 23 (KlickTipp). Stattdessen:
das Kalender-Item zeigt den integrierten Status aus `blogStatus/newsletterStatus/socialStatus`.

Falls die Felder bereits existieren: Kalender-Karte zeigt bis zu 2 Badges
(Content-Status + WP/KT-Status) wenn gesetzt.

**3. Drag-and-Drop: Rollback-Logik**

Der aktuelle `handleDrop` führt ein optimistisches Update (`setItems(updated)`)
durch. Wenn der API-Call scheitert, bleibt das UI im falschen Zustand. Mit dem
neuen Catch: `items`-Snapshot vor dem Update speichern und bei Fehler wiederherstellen.

### Acceptance Checklist

- [ ] Drag-and-Drop zwischen Monaten: Item wechselt Monat + API gespeichert
- [ ] API-Fehler beim Drag: Item springt zum Original-Monat zurück + `console.error('[Vysible] …', err)` (Client-Component)
- [ ] Farbcodierung: Ausstehend (grau) / In Bearbeitung (gelb) / Freigegeben (grün) / Veröffentlicht (blau)
- [ ] Wenn `wpDraftStatus` im StoredTextResult vorhanden: separater WP-Badge im Kalender-Item
- [ ] Legende unter Kalender aktualisiert wenn neuer Badge hinzugefügt
- [ ] Kein neuer `console.*` ohne `[Vysible]`-Prefix (Client-Components: nur
      `console.warn/error('[Vysible] …', err)`; Server-Code: `logger.*`)

### Commit-Message

```
fix(calendar): Drag-Drop-Rollback, Resilience-Catch, WP/KT-Status-Farbcodierung (Slice 7)
```

---

## Sub-Slice B — Sharing: Newsletter + Social in Share-View (Slice 10 abschliessen)

**Aufwand:** ~1 Tag

### IN

```
app/share/[token]/ShareAccess.tsx    MOD — Newsletter + Social anzeigen
app/share/[token]/page.tsx           PRÜFEN — werden Newsletter/Social mitgeladen?
components/results/SharePanel.tsx    MOD — falls stiller Catch von P2-A noch offen
```

### OUT

```
app/api/projects/[id]/share/route.ts     NICHT anfassen (API ist korrekt)
app/api/share/[token]/verify/route.ts    NICHT anfassen
Passwort-Mechanik                        NICHT anfassen
```

### Was fehlt

**`ShareAccess.tsx`** zeigt aktuell:
- ✅ Themenplan-Tabelle  
- ✅ Blog-Beiträge (HTML)  
- ❌ Newsletter (Betreff A/B, Preheader, Body)  
- ❌ Social-Media-Posts (Text + Plattform)

Exploration zuerst: Werden Newsletter/Social vom Server geladen?

```powershell
Get-Content app/share/[token]/page.tsx
# Prüfen: project.textResults wird übergeben? Enthält es newsletter/socialPosts?
```

Falls `ShareAccess` schon alle `textResults` als Props bekommt (wahrscheinlich):
nur das Rendering fehlt.

**Newsletter-Anzeige (read-only):**
- Betreff A / Betreff B als Labels
- Preheader als kleines Label
- Body: `<div dangerouslySetInnerHTML={{ __html: r.newsletter.body }} />`
- Hinweistext: "Nur-Lesen — keine Bearbeitung möglich"

**Social-Anzeige (read-only):**
- Pro Plattform (Instagram / Facebook / LinkedIn): Platform-Label + Text
- Zeichenzahl anzeigen (IG: /200, FB: /80, LI: /700)
- Kein Edit-Modus

**Abschnitt-Reihenfolge im Share-View:**
1. Themenplan
2. Blog-Beiträge
3. Newsletter  ← NEU
4. Social-Media  ← NEU

**Sicherheitshinweis:** Share-View ist bereits read-only (kein Auth.js-User).
Keine neuen schreibenden API-Calls einführen.

### Acceptance Checklist

- [ ] Share-Link besucht → Passwort eingeben → Zugang
- [ ] Newsletter-Abschnitt vorhanden: Betreff A/B, Preheader, Body (HTML)
- [ ] Social-Abschnitt vorhanden: IG, FB, LI je mit Text + Zeichenzahl
- [ ] Abschnitte nur angezeigt wenn Daten vorhanden (kein leerer Bereich)
- [ ] Read-only: keine Buttons/Formulare im Share-View (außer bestehender Passwort-Eingabe)
- [ ] Direktzugriff auf `/share/ungültiger-token` → 404
- [ ] Abgelaufener Link → 404

### Commit-Message

```
feat(sharing): Newsletter + Social-Posts im Kunden-Freigabelink anzeigen (Slice 10)
```

---

## Abschluss-Validation (nach beiden Sub-Slices)

```powershell
# TypeScript fehlerfrei
node node_modules/typescript/bin/tsc --noEmit

# Server-Code (lib/, app/api/): Keine console.* erlaubt
Select-String "console\.(log|warn|error)" lib,app/api -Recurse |
  Where-Object { $_.Path -notmatch "scripts[/\\]" }
# → Zero Treffer (Server nutzt logger.*)

# Client-Components: nur console.warn/error mit [Vysible]-Prefix erlaubt
Select-String "console\.(log|warn|error)" components -Recurse |
  Where-Object { $_.Line -notmatch "\[Vysible\]" }
# → Zero Treffer

# Keine neuen stillen Catches
Select-String "\.catch\(\(\)\s*=>\s*\{\s*\}\)" components,app -Recurse
# → Zero Treffer

# Tests grün
pnpm test
```

---

## Abschlussbericht (vom Agent auszufüllen)

```
SPRINT P2-B ABSCHLUSSBERICHT
=============================

Sprint: P2-B — Kalender + Kunden-Sharing

SUB-SLICES:
  A Kalender (Slice 7):         [ ] DONE — Commit: <hash>
  B Sharing (Slice 10):         [ ] DONE — Commit: <hash>

DRIFT (Abweichungen vom Prompt):
  <keiner / dokumentieren>
  Besonders: WP/KT-Status-Felder in StoredTextResult vorhanden? [ ] ja / [ ] nein

CHECKS:
  TypeScript 0 Fehler:                  [ ]
  Alle Tests grün:                      [ ] x/x PASS
  Keine console.* ohne [Vysible]:       [ ] (Server: 0 console.*; Client: nur console.warn/error mit Prefix)
  Keine stillen Catches:                [ ]
  CHANGELOG aktuell:                    [ ]

═══════════════════════════════════════════════
[OK] P2-B ABGESCHLOSSEN
▶ Nächste Priorität: Sprint P2-C (E-Mail vollständig)
▶ ARCHIVIEREN: Move-Item docs/dev-prompts/sprint-p2b-kalender-sharing.md docs/dev-prompts/archive/
═══════════════════════════════════════════════
```
