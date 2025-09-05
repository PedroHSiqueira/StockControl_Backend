import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createNotificacao(app: FastifyInstance) {
  app.post("/notificacao", async (request, reply) => {
    try {
      const criarNotificacaoBody = z.object({
        titulo: z.string().min(1, "Título é obrigatório"),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        usuarioId: z.string().uuid("ID de usuário inválido").optional(),
        nomeRemetente: z.string().min(1, "Nome do remetente é obrigatório"),
        empresaId: z.string().uuid("ID de empresa inválido").optional(),
        isEmpresa: z.boolean().optional().default(false),
      });

      const { titulo, descricao, usuarioId, nomeRemetente, empresaId, isEmpresa } = criarNotificacaoBody.parse(request.body);

      if (!titulo || !descricao || !nomeRemetente) {
        reply.status(400).send({ mensagem: "Título, descrição e nome do remetente são obrigatórios" });
        return;
      }

      if (!isEmpresa && !usuarioId) {
        reply.status(400).send({ mensagem: "Para notificações individuais, o ID do usuário é obrigatório" });
        return;
      }

      if (isEmpresa && !empresaId) {
        reply.status(400).send({ mensagem: "Para notificações de empresa, o ID da empresa é obrigatório" });
        return;
      }

      const descricaoFormatada = `Enviado por ${nomeRemetente}: ${descricao}`;

      const notificacao = await prisma.notificacao.create({
        data: {
          titulo,
          descricao: descricaoFormatada,
          lida: false,
          ...(isEmpresa
            ? {
                empresa: { connect: { id: empresaId } },
              }
            : {
                usuario: { connect: { id: usuarioId } },
              }),
        },
      });

      return reply.status(201).send({
        success: true,
        notificacao,
      });
    } catch (error) {
      console.error("Erro ao criar notificação:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao processar a notificação",
      });
    }
  });
}
