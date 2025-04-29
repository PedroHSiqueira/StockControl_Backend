-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "empresaId" VARCHAR(36);

-- CreateTable
CREATE TABLE "empresas" (
    "id" VARCHAR(36) NOT NULL,
    "nome" VARCHAR(60) NOT NULL,
    "email" VARCHAR(60) NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "empresas_email_key" ON "empresas"("email");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
