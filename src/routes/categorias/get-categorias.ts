import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getCategorias(app: FastifyInstance) {
  app.get("/categorias", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const categorias = await prisma.categoria.findMany();

      reply.send(categorias);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
