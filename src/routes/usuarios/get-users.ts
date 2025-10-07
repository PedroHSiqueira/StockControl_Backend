import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UserNotFoundError } from "../../exceptions/UserNotFoundException";

export async function getUsers(app: FastifyInstance) {
  app.get("/usuario", async (request, reply) => {
    const users = await prisma.usuario.findMany();

    reply.send(users);
  });

  app.get("/usuario/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const user = await prisma.usuario.findUnique({
        where: {
          id: String(id),
        },
      });

      if (!user) {
        throw new UserNotFoundError("Usuário não encontrado");
      }

      reply.send(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) return reply.status(404).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/usuario/contagem/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };

    const count = await prisma.usuario.count({
      where: {
        empresaId: String(empresaId),
      },
    });

    return reply.send({ quantidade: count });
  });
}
