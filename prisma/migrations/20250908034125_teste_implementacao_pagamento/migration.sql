-- CreateEnum
CREATE TYPE "StatusAssinatura" AS ENUM ('ATIVA', 'PENDENTE', 'CANCELADA', 'EXPIRADA', 'BLOQUEADA');

-- CreateTable
CREATE TABLE "planos_assinatura" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "precoMensal" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planos_assinatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" VARCHAR(36) NOT NULL,
    "empresaId" VARCHAR(36) NOT NULL,
    "planoId" VARCHAR(36) NOT NULL,
    "status" "StatusAssinatura" NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataProximoPagamento" TIMESTAMP(3) NOT NULL,
    "dataExpiracao" TIMESTAMP(3),
    "idPagamentoExterno" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_empresaId_key" ON "assinaturas"("empresaId");

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "planos_assinatura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
