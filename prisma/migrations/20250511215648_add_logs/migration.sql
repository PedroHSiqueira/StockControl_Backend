-- CreateEnum
CREATE TYPE "TipoLog" AS ENUM ('CRIACAO', 'ATUALIZACAO', 'EXCLUSAO');

-- CreateTable
CREATE TABLE "logs" (
    "id" VARCHAR(36) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "tipo" "TipoLog" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);
