-- CreateEnum
CREATE TYPE "Level" AS ENUM ('DEBUTANT', 'INTERMEDIAIRE', 'AVANCE');

-- CreateEnum
CREATE TYPE "Format" AS ENUM ('PRESENTIEL', 'EN_LIGNE', 'HYBRIDE');

-- CreateEnum
CREATE TYPE "FormationKind" AS ENUM ('PERMANENTE', 'EVENEMENTIELLE');

-- CreateEnum
CREATE TYPE "OpportuniteType" AS ENUM ('STAGE', 'EMPLOI', 'APPEL_OFFRE', 'FINANCEMENT', 'COLLABORATION');

-- CreateTable
CREATE TABLE "Formation" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'FREE',
    "publishedAt" TIMESTAMP(3),
    "level" "Level" NOT NULL,
    "format" "Format" NOT NULL,
    "durationH" INTEGER,
    "kind" "FormationKind" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Formation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'FREE',
    "publishedAt" TIMESTAMP(3),
    "type" "OpportuniteType" NOT NULL,
    "organisme" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "externalUrl" TEXT,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Formation_slug_key" ON "Formation"("slug");

-- CreateIndex
CREATE INDEX "Formation_publishedAt_startsAt_idx" ON "Formation"("publishedAt", "startsAt");

-- CreateIndex
CREATE INDEX "Formation_kind_idx" ON "Formation"("kind");

-- CreateIndex
CREATE INDEX "Formation_level_idx" ON "Formation"("level");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunite_slug_key" ON "Opportunite"("slug");

-- CreateIndex
CREATE INDEX "Opportunite_publishedAt_deadline_idx" ON "Opportunite"("publishedAt", "deadline");

-- CreateIndex
CREATE INDEX "Opportunite_type_idx" ON "Opportunite"("type");
