/*
  Warnings:

  - You are about to drop the `admins` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'CLIENTE');

-- DropTable
DROP TABLE "admins";

-- DropTable
DROP TABLE "users";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
    "senha" VARCHAR(60) NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
CREATE TABLE "produtos" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "descricao" VARCHAR(255) NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "quantidade" INTEGER NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_cnpj_key" ON "fornecedores"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "fornecedores_email_key" ON "fornecedores"("email");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;
