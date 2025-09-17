/*
  Warnings:

  - You are about to drop the `assinaturas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `planos_assinatura` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "assinaturas" DROP CONSTRAINT "assinaturas_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "assinaturas" DROP CONSTRAINT "assinaturas_planoId_fkey";

-- DropTable
DROP TABLE "assinaturas";

-- DropTable
DROP TABLE "planos_assinatura";

-- DropEnum
DROP TYPE "StatusAssinatura";
