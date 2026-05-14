-- Slice B (Slice 4): Pro-Projekt-API-Key-Auswahl (FA-F-11a)
-- Fügt optionale apiKeyId-FK zu Project hinzu.

ALTER TABLE "Project"
  ADD COLUMN "apiKeyId" TEXT;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_apiKeyId_fkey"
  FOREIGN KEY ("apiKeyId")
  REFERENCES "ApiKey"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
