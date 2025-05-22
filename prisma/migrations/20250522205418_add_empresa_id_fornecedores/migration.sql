-- AlterTable
ALTER TABLE "fornecedores" ADD COLUMN     "empresaId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "fornecedores" ADD CONSTRAINT "fornecedores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
