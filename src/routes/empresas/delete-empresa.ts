import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteEmpresa(app: FastifyInstance) {
  app.delete("/empresa/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const empresa = await prisma.empresa.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
