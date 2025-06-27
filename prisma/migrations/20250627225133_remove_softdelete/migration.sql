/*
  Warnings:

  - You are about to alter the column `estado` on the `clientes` table. The data in that column could be lost. The data in that column will be cast from `VarChar(25)` to `VarChar(2)`.
  - You are about to drop the column `ativo` on the `empresas` table. All the data in the column will be lost.
  - You are about to alter the column `estado` on the `empresas` table. The data in that column could be lost. The data in that column will be cast from `VarChar(25)` to `VarChar(2)`.

*/
-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "estado" SET DATA TYPE VARCHAR(2);

-- AlterTable
ALTER TABLE "empresas" DROP COLUMN "ativo",
ALTER COLUMN "estado" SET DATA TYPE VARCHAR(2);
