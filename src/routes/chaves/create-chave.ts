import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function createKey(app: FastifyInstance) {
  app.post("/chaves", async (request, reply) => {
    const chave = crypto.randomUUID();

    const novaChave = await prisma.chaveAtivacao.create({
      data: {
        chave: chave,
      },
    });

    return reply.status(201).send(novaChave);
  });
}
