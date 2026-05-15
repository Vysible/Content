-- AlterTable: per-Projekt KlickTipp-Zugangsdaten
ALTER TABLE "Project" ADD COLUMN "ktApiKeyId" TEXT;

-- CreateIndex
CREATE INDEX "Project_ktApiKeyId_idx" ON "Project"("ktApiKeyId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ktApiKeyId_fkey" FOREIGN KEY ("ktApiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
