-- CreateEnum
CREATE TYPE "PromptDomain" AS ENUM ('ia', 'entrepreneuriat', 'productivite', 'communication');

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "domain" "PromptDomain" NOT NULL DEFAULT 'ia',
ADD COLUMN     "publishedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "excerpt" DROP NOT NULL,
ALTER COLUMN "excerpt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Prompt_publishedAt_domain_idx" ON "Prompt"("publishedAt", "domain");
