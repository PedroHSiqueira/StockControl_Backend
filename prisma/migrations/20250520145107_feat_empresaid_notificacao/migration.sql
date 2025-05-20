-- AlterTable
ALTER TABLE "notificacoes" ADD COLUMN     "empresaId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
