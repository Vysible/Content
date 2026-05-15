-- AlterTable: Add clonedFrom and hedyImportHighlight to Project
ALTER TABLE "Project" ADD COLUMN "clonedFrom" TEXT;
ALTER TABLE "Project" ADD COLUMN "hedyImportHighlight" BOOLEAN NOT NULL DEFAULT false;
