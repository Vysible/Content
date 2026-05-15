-- CreateTable: InvitationToken
CREATE TABLE "InvitationToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "praxisUserId" TEXT,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ContentApproval
CREATE TABLE "ContentApproval" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contentIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ausstehend',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationToken_token_key" ON "InvitationToken"("token");

-- CreateIndex
CREATE INDEX "InvitationToken_token_idx" ON "InvitationToken"("token");

-- CreateIndex
CREATE INDEX "InvitationToken_projectId_idx" ON "InvitationToken"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentApproval_projectId_contentIndex_key" ON "ContentApproval"("projectId", "contentIndex");

-- CreateIndex
CREATE INDEX "ContentApproval_projectId_status_idx" ON "ContentApproval"("projectId", "status");

-- CreateIndex: PraxisUser compound unique
CREATE UNIQUE INDEX "PraxisUser_email_projectId_key" ON "PraxisUser"("email", "projectId");

-- AddForeignKey
ALTER TABLE "InvitationToken" ADD CONSTRAINT "InvitationToken_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToken" ADD CONSTRAINT "InvitationToken_praxisUserId_fkey" FOREIGN KEY ("praxisUserId") REFERENCES "PraxisUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentApproval" ADD CONSTRAINT "ContentApproval_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentApproval" ADD CONSTRAINT "ContentApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "PraxisUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
