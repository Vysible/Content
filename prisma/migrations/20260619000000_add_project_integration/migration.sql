CREATE TABLE "ProjectIntegration" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectIntegration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectIntegration_projectId_provider_key" ON "ProjectIntegration"("projectId", "provider");
CREATE INDEX "ProjectIntegration_projectId_idx" ON "ProjectIntegration"("projectId");
ALTER TABLE "ProjectIntegration" ADD CONSTRAINT "ProjectIntegration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
