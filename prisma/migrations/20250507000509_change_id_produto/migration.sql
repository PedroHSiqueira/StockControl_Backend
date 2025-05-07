-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'CLIENTE', 'PROPRIETARIO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "empresaId" INTEGER,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fornecedores" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "telefone" VARCHAR(15) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fornecedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "foto" VARCHAR(255),
    "telefone" VARCHAR(15),
    "endereco" VARCHAR(255),
    "pais" VARCHAR(60),
    "estado" VARCHAR(2),
    "cidade" VARCHAR(60),
    "cep" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "foto" VARCHAR(255),
    "fornecedorId" VARCHAR(36),
    "categoriaId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" VARCHAR(36) NOT NULL,
    "titulo" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "usuarioId" VARCHAR(36),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_email_key" ON "fornecedores"("email");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_email_key" ON "empresas"("email");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
