-- CreateTable
CREATE TABLE "chaves_ativacao" (
    "id" VARCHAR(36) NOT NULL,
    "chave" VARCHAR(36) NOT NULL,
    "empresaId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chaves_ativacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chaves_ativacao_chave_key" ON "chaves_ativacao"("chave");

-- CreateIndex
CREATE UNIQUE INDEX "chaves_ativacao_empresaId_key" ON "chaves_ativacao"("empresaId");

-- AddForeignKey
ALTER TABLE "chaves_ativacao" ADD CONSTRAINT "chaves_ativacao_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
