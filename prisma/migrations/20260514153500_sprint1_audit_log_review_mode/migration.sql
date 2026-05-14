-- Sprint 1: AuditLog, ReviewMode, HWG-Flag

CREATE TYPE "ReviewMode" AS ENUM ('SIMPLE', 'COMPLETE');

ALTER TABLE "Project"
  ADD COLUMN "reviewMode" "ReviewMode" NOT NULL DEFAULT 'SIMPLE',
  ADD COLUMN "hwgFlag"    BOOLEAN      NOT NULL DEFAULT false;

CREATE TABLE "AuditLog" (
    "id"        TEXT         NOT NULL,
    "projectId" TEXT,
    "userId"    TEXT,
    "userEmail" TEXT,
    "action"    TEXT         NOT NULL,
    "entity"    TEXT         NOT NULL,
    "entityId"  TEXT,
    "meta"      JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_projectId_idx" ON "AuditLog"("projectId");
CREATE INDEX "AuditLog_userId_idx"    ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx"    ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
