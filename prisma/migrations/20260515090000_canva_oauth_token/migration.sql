-- Sprint P2-E (Slice 17): CanvaToken-Tabelle für OAuth 2.0 Access-/Refresh-Token

-- CreateTable
CREATE TABLE "CanvaToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvaToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CanvaToken_userId_key" ON "CanvaToken"("userId");

-- AddForeignKey
ALTER TABLE "CanvaToken" ADD CONSTRAINT "CanvaToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
