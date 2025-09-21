import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getLogs(app: FastifyInstance) {
  app.get("/logs", async (request, reply) => {
    const logs = await prisma.logs.findMany();
    reply.send(logs);
  });


  app.get("/logs/produto/:produtoId", async (request, reply) => {
    try {
      const { produtoId } = request.params as { produtoId: string };

      const logs = await prisma.logs.findMany({
        where: {
          OR: [
            {
              descricao: {
                contains: produtoId
              }
            },
            {
              descricao: {
                contains: `"produtoId":${produtoId}`
              }
            },
            {
              descricao: {
                contains: `"produtoId": ${produtoId}`
              }
            }
          ]
        },
        include: {
          usuario: {
            select: {
              nome: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      reply.send(logs);
    } catch (error) {
      console.error("Erro ao buscar logs do produto:", error);
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
