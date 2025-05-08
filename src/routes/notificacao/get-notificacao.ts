import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getNotificacao(app: FastifyInstance) {
  app.get("/notificacao", async (request, reply) => {
    const notificacao = await prisma.notificacao.findMany({
      include: {
        convite: {
          include: {
            empresa: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    reply.send(notificacao);
  });

  app.get("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const notificacoes = await prisma.notificacao.findMany({
      where: {
        usuarioId: id,
      },
      include: {
        convite: {
          include: {
            empresa: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    reply.send(notificacoes);
  });
}
