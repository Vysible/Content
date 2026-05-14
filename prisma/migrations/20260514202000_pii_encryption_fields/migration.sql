-- Sprint 3: PII-Encryption — emailEncrypted/nameEncrypted für User und PraxisUser
-- Felder sind nullable; Plaintext-Felder (email, name) bleiben für parallelen Betrieb erhalten.

ALTER TABLE "User"
  ADD COLUMN "emailEncrypted" TEXT,
  ADD COLUMN "nameEncrypted"  TEXT;

ALTER TABLE "PraxisUser"
  ADD COLUMN "emailEncrypted" TEXT,
  ADD COLUMN "nameEncrypted"  TEXT;
