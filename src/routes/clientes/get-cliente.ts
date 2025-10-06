import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getCliente(app: FastifyInstance) {
  app.get("/clientes", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const clientes = await prisma.cliente.findMany({
        include: {
          empresa: true,
        },
      });

      if (clientes.length === 0) {
        return reply.status(404).send({ mensagem: "Nenhum cliente encontrado." });
      }

      reply.status(200).send({ clientes });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
