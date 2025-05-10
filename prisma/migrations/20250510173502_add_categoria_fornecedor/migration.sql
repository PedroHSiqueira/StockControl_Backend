/*
  Warnings:

  - Added the required column `categoria` to the `fornecedores` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "fornecedores" ADD COLUMN     "categoria" VARCHAR(60) NOT NULL;
