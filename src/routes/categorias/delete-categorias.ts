import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function deleteCategorias(app: FastifyInstance) {
  app.delete("/categorias/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { id } = request.params as { id: string };

      await prisma.categoria.delete({
        where: {
          id: String(id),
        },
      });

      reply.status(204);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
