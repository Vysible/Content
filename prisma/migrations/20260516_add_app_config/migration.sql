-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "themesMinPraxisQuote" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "themesMinSeoQuote" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "modelThemes" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "modelBlogOutline" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "modelBlog" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "modelNewsletter" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "modelSocial" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "modelImageBrief" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
