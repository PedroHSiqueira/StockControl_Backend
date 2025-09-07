import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function createKey(app: FastifyInstance) {
  app.post("/chaves", async (request, reply) => {
    try {
      const chave = crypto.randomUUID();

      const novaChave = await prisma.chaveAtivacao.create({
        data: {
          chave: chave,
          utilizada: false,
        },
      });

      return reply.status(201).send({
        mensagem: "Chave criada com sucesso",
        chave: novaChave.chave
      });
    } catch (error) {
      console.error("Erro ao criar chave:", error);
      return reply.status(500).send({ 
        mensagem: "Erro interno ao criar chave" 
      });
    }
  });
}