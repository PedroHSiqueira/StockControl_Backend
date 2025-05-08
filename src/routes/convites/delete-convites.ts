import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteConvite(app: FastifyInstance) {
  app.delete("/convite/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const notificacao = await prisma.notificacao.delete({
      where: {
        conviteId: id,
      },
    });
    reply.status(204);
  });
}
