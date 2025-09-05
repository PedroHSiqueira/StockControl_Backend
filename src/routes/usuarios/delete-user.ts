import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteUser(app: FastifyInstance) {
  app.delete("/usuarios/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.usuario.delete({
      where: {
        id: String(id),
      },
    });

    reply.status(204);
  });
}
