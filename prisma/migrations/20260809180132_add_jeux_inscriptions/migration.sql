-- CreateTable
CREATE TABLE "Jeu" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'FREE',
    "startsAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "capacity" INTEGER,
    "location" TEXT,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jeu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jeuId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormationInscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormationInscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Jeu_slug_key" ON "Jeu"("slug");

-- CreateIndex
CREATE INDEX "Jeu_publishedAt_idx" ON "Jeu"("publishedAt");

-- CreateIndex
CREATE INDEX "Inscription_jeuId_idx" ON "Inscription"("jeuId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_userId_jeuId_key" ON "Inscription"("userId", "jeuId");

-- CreateIndex
CREATE INDEX "FormationInscription_formationId_idx" ON "FormationInscription"("formationId");

-- CreateIndex
CREATE UNIQUE INDEX "FormationInscription_userId_formationId_key" ON "FormationInscription"("userId", "formationId");

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_jeuId_fkey" FOREIGN KEY ("jeuId") REFERENCES "Jeu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationInscription" ADD CONSTRAINT "FormationInscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormationInscription" ADD CONSTRAINT "FormationInscription_formationId_fkey" FOREIGN KEY ("formationId") REFERENCES "Formation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
