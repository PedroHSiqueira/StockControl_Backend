import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteNotificacao(app: FastifyInstance) {
  app.delete("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const usuarioId = (request.query as { usuarioId?: string })?.usuarioId;

    try {
      await prisma.notificacaoLida.deleteMany({
        where: {
          notificacaoId: id,
          ...(usuarioId && { usuarioId }),
        },
      });

      await prisma.notificacao.delete({
        where: { id },
      });

      return reply.status(200).send({
        success: true,
        message: "Notificação excluída com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro ao processar a exclusão da notificação",
      });
    }
  });
}
