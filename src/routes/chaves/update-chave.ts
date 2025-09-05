import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";

export async function updateKey(app: FastifyInstance) {
  app.put("/chave/:chave", async (request: FastifyRequest, reply) => {
    try {
      const { chave } = request.params as { chave: string };
      const { empresaId } = request.body as { chave: string; empresaId: string };

      const chaveExistente = await prisma.chaveAtivacao.findUnique({
        where: { chave },
      });

      if (!chaveExistente) {
        return reply.status(404).send({ mensagem: "Chave não encontrada" });
      }

      const chaveAtualizada = await prisma.chaveAtivacao.update({
        where: { chave },
        data: {
          empresaId,
        },
      });

      return reply.status(200).send({ mensagem: "Chave atualizada com sucesso" });
    } catch (error) {
      reply.status(500).send("Erro ao atualizar chave");
    }
  });
}
