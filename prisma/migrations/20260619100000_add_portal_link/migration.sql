CREATE TABLE "PortalLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "showAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PortalLink_token_key" ON "PortalLink"("token");
CREATE INDEX "PortalLink_token_idx" ON "PortalLink"("token");
CREATE INDEX "PortalLink_projectId_idx" ON "PortalLink"("projectId");
ALTER TABLE "PortalLink" ADD CONSTRAINT "PortalLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
