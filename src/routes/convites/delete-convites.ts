import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteConvite(app: FastifyInstance) {
  app.delete("/convite/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const convite = await prisma.convite.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
