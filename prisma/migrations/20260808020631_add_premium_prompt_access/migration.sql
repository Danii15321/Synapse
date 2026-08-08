-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('FREE', 'PREMIUM');

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "body" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "excerpt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "visibility" "Visibility" NOT NULL DEFAULT 'FREE';
