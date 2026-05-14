-- Slice A (Slice 16): Passwort-Vergessen-Flow
-- Fügt resetToken und resetTokenExpiry zum User-Modell hinzu.

ALTER TABLE "User"
  ADD COLUMN "resetToken"       TEXT,
  ADD COLUMN "resetTokenExpiry" TIMESTAMP(3);
