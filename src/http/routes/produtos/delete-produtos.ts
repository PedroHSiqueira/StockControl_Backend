import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteProduto(app: FastifyInstance) {
  app.delete("/produtos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const fornecedor = await prisma.produto.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
