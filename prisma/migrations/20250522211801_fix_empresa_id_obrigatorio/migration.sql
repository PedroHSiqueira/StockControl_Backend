/*
  Warnings:

  - Made the column `empresaId` on table `fornecedores` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "fornecedores" DROP CONSTRAINT "fornecedores_empresaId_fkey";

-- AlterTable
ALTER TABLE "fornecedores" ALTER COLUMN "empresaId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
