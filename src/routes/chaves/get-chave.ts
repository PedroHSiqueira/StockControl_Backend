import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getKey(app: FastifyInstance) {
  app.get("/chaves", async (request, reply) => {
    try {
      const chaves = await prisma.chaveAtivacao.findMany({
        include: {
          empresa: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          },
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return reply.status(200).send(chaves);
    } catch (error) {
      console.error("Erro ao buscar chaves:", error);
      return reply.status(500).send({ 
        mensagem: "Erro interno ao buscar chaves" 
      });
    }
  });
}