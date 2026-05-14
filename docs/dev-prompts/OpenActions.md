# Offene Punkte

## Sprint 3 (benötigt laufende DB / VPS-Zugriff)

1. **Prisma-Migration ausführen** (Sprint 3 — PII-Felder):
   ```powershell
   npx prisma migrate deploy
   ```
   Migration-Datei: `prisma/migrations/20260514202000_pii_encryption_fields/migration.sql`

2. **PII-Datenmigration ausführen** (einmalig, nach migrate deploy):
   ```powershell
   pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-pii.ts
   ```
   Idempotent — kann mehrfach ausgeführt werden, bereits migrierte Einträge werden übersprungen.

---

## Sprint 0

Zwei offene Punkte (benötigen laufende DB)
1. prisma migrate deploy muss gegen die Live-DB ausgeführt werden SQL-Datei ist commitbereit

2. SMTP-Datenmigration: Bestehende HEDY-ApiKey-SMTP-Einträge müssen einmalig in SmtpConfig übertragen werden (kann über Prisma Studio gemacht werden)