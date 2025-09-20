-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "pedidos" (
    "id" VARCHAR(36) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "fornecedorId" VARCHAR(36) NOT NULL,
    "empresaId" VARCHAR(36) NOT NULL,
    "usuarioId" VARCHAR(36) NOT NULL,
    "observacoes" VARCHAR(500),
    "status" "StatusPedido" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" VARCHAR(36) NOT NULL,
    "pedidoId" VARCHAR(36) NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidadeSolicitada" INTEGER NOT NULL,
    "quantidadeAtendida" INTEGER NOT NULL DEFAULT 0,
    "precoUnitario" DOUBLE PRECISION NOT NULL,
    "observacao" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
