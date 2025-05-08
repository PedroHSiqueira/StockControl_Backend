/*
  Warnings:

  - A unique constraint covering the columns `[conviteId]` on the table `notificacoes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusConvite" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "conviteId" VARCHAR(36);

-- CreateTable
CREATE TABLE "convites" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "empresaId" VARCHAR(36) NOT NULL,
    "status" "StatusConvite" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_conviteId_key" ON "notificacoes"("conviteId");

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_conviteId_fkey" FOREIGN KEY ("conviteId") REFERENCES "convites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convites" ADD CONSTRAINT "convites_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
