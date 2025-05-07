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
      foto: z.string().optional(),
      categoriaId: z.string().optional(),
      fornecedorId: z.string().optional(),
    });

    const { id } = request.params as { id: number };
    const { nome, descricao, preco, quantidade, foto, categoriaId, fornecedorId} = updateProdutosBody.parse(request.body);

    const fornecedor = await prisma.produto.update({
      where: {
        id: id,
      },
      data: {
        nome: nome,
        descricao: descricao,
        preco: preco,
        quantidade: quantidade,
        foto: foto,
        categoriaId: categoriaId,
        fornecedorId: fornecedorId,
      },
    });

    reply.send(fornecedor);
  });
}