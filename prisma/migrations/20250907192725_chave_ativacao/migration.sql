-- AlterTable
ALTER TABLE "chaves_ativacao" ADD COLUMN     "dataUso" TIMESTAMP(3),
ADD COLUMN     "utilizada" BOOLEAN NOT NULL DEFAULT false;
