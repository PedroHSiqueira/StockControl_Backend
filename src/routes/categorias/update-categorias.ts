import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateCategorias(app: FastifyInstance) {
  app.put("/categorias/:id", async (request, reply) => {
    const updateCategoriasBody = z.object({
      nome: z.string(),
      descricao: z.string(),
    });

    const { id } = request.params as { id: string };
    const { nome, descricao } = updateCategoriasBody.parse(request.body);

    const categorias = await prisma.categoria.update({
      where: {
        id: String(id),
      },
      data: {
        nome: nome,
        descricao: descricao,
      },
    });

    reply.send(categorias);
  });
}