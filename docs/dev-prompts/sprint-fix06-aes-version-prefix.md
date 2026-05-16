# Sprint FIX-06 — AES-256-GCM Versions-Präfix für Key-Rotation (ADR-003)

## Kontext

`lib/crypto/aes.ts` speichert verschlüsselte Werte im Format `iv:authTag:ciphertext` (hex-kodiert).
ADR-003 identifiziert dies als bekannte Lücke: Ohne Versions-Präfix ist eine Key-Rotation
(neuer `ENCRYPTION_SECRET_V2`) nicht möglich ohne alle verschlüsselten Werte gleichzeitig zu migrieren.

## Ziel

Format ändern auf `v1:iv:authTag:ciphertext`.
Rückwärtskompatibilität für alle bestehenden Werte (kein Präfix = v1-Schlüssel).
Einmaliges Migrations-Script für bestehende DB-Einträge.

## Betroffene ENV-Variablen

Aktuell: `ENCRYPTION_SECRET` (64-Hex-Zeichen = 32 Bytes)
Neu: `ENCRYPTION_SECRET_V1` (identischer Wert, nur umbenannt)
Übergangsweise: beide ENV-Variablen gleichzeitig unterstützen.

## Zu erstellende/ändernde Dateien

### ÄNDERN: `lib/crypto/aes.ts`

```typescript
// encrypt(): Ausgabe mit v1:-Präfix
// Format: "v1:" + iv.hex + ":" + authTag.hex + ":" + ciphertext.hex

// decrypt(): Versions-aware
// - Beginnt mit "v1:" → ENCRYPTION_SECRET_V1 verwenden
// - Kein Präfix → ENCRYPTION_SECRET (Rückwärtskompatibilität, identischer Key)
// - Beginnt mit "v2:" → (Vorbereitung) ENCRYPTION_SECRET_V2 verwenden, noch nicht implementiert

// Schlüssel-Auflösung:
// ENCRYPTION_SECRET_V1 ?? ENCRYPTION_SECRET → Key für v1
// Wenn keiner gesetzt → Error werfen
```

### ÄNDERN: `.env.example`

```
# AES-256-GCM Schlüssel (Version 1) — 64 Hex-Zeichen = 32 Bytes
# Generieren: openssl rand -hex 32
# Gleiches Secret wie bisheriger ENCRYPTION_SECRET — nur umbenannt
ENCRYPTION_SECRET_V1="REPLACE_WITH_64_CHAR_HEX_STRING"

# Legacy-Fallback (wird nach Migration entfernt)
# ENCRYPTION_SECRET="..."  ← auskommentieren, sobald Migrations-Script gelaufen
```

### NEU: `scripts/migrate-aes-prefix.ts`

```
Zweck: Einmaliges Migrations-Script, das alle verschlüsselten Felder
von "iv:tag:cipher" auf "v1:iv:tag:cipher" aktualisiert.

Betroffene Felder:
- ApiKey.encryptedKey (alle Zeilen)
- SmtpConfig.encryptedPassword (alle Zeilen)
- CanvaToken.encryptedAccessToken (alle Zeilen)
- CanvaToken.encryptedRefreshToken (alle Zeilen)
- PraxisUser.emailEncrypted (wenn befüllt)
- PraxisUser.nameEncrypted (wenn befüllt)
- User.emailEncrypted (wenn befüllt)
- User.nameEncrypted (wenn befüllt)

Logik pro Feld:
1. Alle Zeilen laden
2. Für jeden Eintrag: decrypt() (liest alten Wert ohne Präfix)
3. encrypt() (schreibt neuen Wert mit v1:-Präfix)
4. prisma.model.update({ data: { field: newValue } })
5. Fortschritt loggen (n/total)

Sicherheits-Checks:
- Dry-Run-Modus als Standard (--apply Flag nötig für echte Änderungen)
- Vor und nach Migration: erster Eintrag decrypten und ausgeben (nur Länge, kein Inhalt)
- Bei Fehler: Script abbrechen, keine weiteren Updates
```

## Unit-Tests: `__tests__/unit/crypto/aes.test.ts` erweitern

```typescript
// Neue Tests:
it('encrypt() gibt v1:-Präfix zurück')
it('decrypt("v1:...") entschlüsselt korrekt')
it('decrypt("iv:tag:cipher" ohne Präfix) — Rückwärtskompatibilität')
it('decrypt("v2:...") wirft Error (nicht implementiert)')
```

## Akzeptanzkriterien

- [ ] `encrypt()` gibt immer einen String zurück der mit `v1:` beginnt
- [ ] `decrypt("v1:...")` funktioniert korrekt
- [ ] `decrypt("iv:tag:cipher")` (ohne Präfix) funktioniert weiterhin
- [ ] Alle bestehenden Unit-Tests in `aes.test.ts` bestehen weiterhin
- [ ] `scripts/migrate-aes-prefix.ts --dry-run` läuft ohne Fehler auf Dev-DB
- [ ] `scripts/migrate-aes-prefix.ts --apply` migriert alle Felder korrekt
- [ ] Nach Migration: Login, API-Key-Entschlüsselung, Export weiterhin funktional

## Deployment-Reihenfolge (WICHTIG)

1. Code deployen (neues `encrypt`/`decrypt` mit Rückwärtskompatibilität)
2. `ENCRYPTION_SECRET_V1` in Coolify hinzufügen (gleicher Wert wie bisheriger `ENCRYPTION_SECRET`)
3. Migrations-Script auf Prod ausführen: `npx tsx scripts/migrate-aes-prefix.ts --apply`
4. Verifizieren: Login + API-Key-Test
5. `ENCRYPTION_SECRET` (altes Env) aus Coolify entfernen

## Stop-Conditions

- Keine Änderungen an der Pipeline oder anderen Modulen
- Script nicht automatisch in CI/CD — nur manuell ausführen
- Kein Breaking Change: bestehende verschlüsselte Werte müssen weiterhin lesbar sein
