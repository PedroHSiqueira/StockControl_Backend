import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getNotificacao(app: FastifyInstance) {
  app.get("/notificacao", async (request, reply) => {
    const notificacao = await prisma.notificacao.findMany();

    reply.send(notificacao);
  });
}