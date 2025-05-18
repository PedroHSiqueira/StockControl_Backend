-- AlterTable
ALTER TABLE "vendas" ADD COLUMN     "usuarioId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
