import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteCategorias(app: FastifyInstance) {
  app.delete("/categorias/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const categoria = await prisma.categoria.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
