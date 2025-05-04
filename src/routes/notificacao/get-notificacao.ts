import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getNotificacao(app: FastifyInstance) {
  app.get("/notificacao", async (request, reply) => {
    const notificacao = await prisma.notificacao.findMany();

    reply.send(notificacao);
  });

  app.get("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const notificacao = await prisma.notificacao.findMany({
      where: {
        usuarioId: String(id),
      },
    });

    if (!notificacao) {
      return reply.status(404).send({ mensagem: "Notificação não encontrada" });
    }

    reply.send(notificacao);
  });
  
}