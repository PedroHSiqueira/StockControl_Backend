-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "usuarioId" VARCHAR(36);

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
