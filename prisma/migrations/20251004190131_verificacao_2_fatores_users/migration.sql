-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "codigoExpiracao" TIMESTAMP(3),
ADD COLUMN     "codigoVerificacao" VARCHAR(6),
ADD COLUMN     "doisFAAprovado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "doisFADataAprovado" TIMESTAMP(3),
ADD COLUMN     "doisFAExpiracao" TIMESTAMP(3),
ADD COLUMN     "doisFAToken" VARCHAR(6),
ADD COLUMN     "emailVerificado" BOOLEAN NOT NULL DEFAULT false;
