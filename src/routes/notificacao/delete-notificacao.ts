import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteNotificacao(app: FastifyInstance) {
  app.delete("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const notificacao = await prisma.notificacao.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
