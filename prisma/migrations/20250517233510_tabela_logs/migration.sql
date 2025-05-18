-- AlterEnum
ALTER TYPE "TipoLog" ADD VALUE 'BAIXA';

-- AlterTable
ALTER TABLE "logs" ADD COLUMN     "empresaId" VARCHAR(36),
ADD COLUMN     "usuarioId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
