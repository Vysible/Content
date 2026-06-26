-- CreateTable
CREATE TABLE "CostSettings" (
    "id" TEXT NOT NULL,
    "monthlyAlertEur" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "alertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostSettings_pkey" PRIMARY KEY ("id")
);
