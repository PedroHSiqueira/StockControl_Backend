-- CreateTable
CREATE TABLE "notificacoes_lidas" (
    "notificacaoId" VARCHAR(36) NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_lidas_pkey" PRIMARY KEY ("notificacaoId","usuarioId")
);

-- AddForeignKey
ALTER TABLE "notificacoes_lidas" ADD CONSTRAINT "notificacoes_lidas_notificacaoId_fkey" FOREIGN KEY ("notificacaoId") REFERENCES "notificacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes_lidas" ADD CONSTRAINT "notificacoes_lidas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
