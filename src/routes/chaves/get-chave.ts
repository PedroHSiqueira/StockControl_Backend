import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getKey(app: FastifyInstance) {
  app.get("/chaves", async (request, reply) => {
    try {
      const chaves = await prisma.chaveAtivacao.findMany({
        include: {
          empresa: true,
        },
      });
      return chaves;
    } catch (error) {
      reply.status(500).send("Erro ao buscar chaves");
    }
  });
}
