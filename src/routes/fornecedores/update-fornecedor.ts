import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateFornecedor(app: FastifyInstance) {
  app.put("/fornecedor/:id", async (request, reply) => {
    const updateUserBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      cnpj: z.string(),
      telefone: z.string(),
      categoria: z.string(),
      foto: z.string().optional(),
    });

    const { id } = request.params as { id: string };
    const { nome, email, cnpj, telefone, foto, categoria } = updateUserBody.parse(request.body);

    const fornecedor = await prisma.fornecedor.update({
      where: {
        id: String(id),
      },
      data: {
        nome: nome,
        email: email,
        cnpj: cnpj,
        telefone: telefone,
        foto: foto,
        categoria: categoria,
      },
    });

     await prisma.logs.create({
          data: {
          descricao: `Fornecedor Atualizado: ${fornecedor.nome}`,
          tipo: "ATUALIZACAO",
          },
        });
    reply.send(fornecedor);
  });
}