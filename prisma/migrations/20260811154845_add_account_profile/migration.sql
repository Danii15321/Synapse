-- CreateEnum
CREATE TYPE "ProfessionalLevel" AS ENUM ('ELEVE', 'ETUDIANT', 'DIPLOME', 'AUTRE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "professionalLevel" "ProfessionalLevel";
