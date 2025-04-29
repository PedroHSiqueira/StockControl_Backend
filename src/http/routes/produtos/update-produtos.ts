import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateProduto(app: FastifyInstance) {
  app.put("/produtos/:id", async (request, reply) => {
    const updateProdutosBody = z.object({
      nome: z.string(),
      descricao: z.string(),
      preco: z.number(),
      quantidade: z.number(),
      categoriaId: z.string().optional(),
      fornecedorId: z.string().optional(),
    });

    const { id } = request.params as { id: string };
    const { nome, descricao, preco, quantidade, categoriaId, fornecedorId} = updateProdutosBody.parse(request.body);

    const fornecedor = await prisma.produto.update({
      where: {
        id: String(id),
      },
      data: {
        nome: nome,
        descricao: descricao,
        preco: preco,
        quantidade: quantidade,
        categoriaId: categoriaId,
        fornecedorId: fornecedorId,
      },
    });

    reply.send(fornecedor);
  });
}