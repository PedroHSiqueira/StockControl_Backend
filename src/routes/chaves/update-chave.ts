import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";

export async function updateKey(app: FastifyInstance) {
  app.put("/chave/:chave", async (request: FastifyRequest, reply) => {
    try {
      const { chave } = request.params as { chave: string };
      const { empresaId } = request.body as { empresaId: string };

      const chaveExistente = await prisma.chaveAtivacao.findUnique({
        where: { chave },
      });

      if (!chaveExistente) {
        return reply.status(404).send({ mensagem: "Chave não encontrada" });
      }

      if (chaveExistente.utilizada) {
        return reply.status(400).send({
          mensagem: "Esta chave já foi utilizada e não pode ser reativada"
        });
      }

      const empresaComChave = await prisma.empresa.findUnique({
        where: { id: empresaId },
        include: { ChaveAtivacao: true }
      });

      if (empresaComChave?.ChaveAtivacao) {
        return reply.status(400).send({
          mensagem: "Esta empresa já possui uma chave de ativação"
        });
      }

      const chaveAtualizada = await prisma.chaveAtivacao.update({
        where: { chave },
        data: {
          empresaId,
          utilizada: true,
          dataUso: new Date(),
        },
      });

      return reply.status(200).send({
        mensagem: "Empresa ativada com sucesso",
        chave: chaveAtualizada
      });
    } catch (error) {
      console.error("Erro ao atualizar chave:", error);
      return reply.status(500).send({
        mensagem: "Erro interno ao processar a ativação"
      });
    }
  });
}