-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "empresaId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
