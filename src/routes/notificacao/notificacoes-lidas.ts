import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function notificacoesLidas(app: FastifyInstance) {
  app.post("/notificacoes-lidas/marcar-todas", async (request, reply) => {
    const bodySchema = z.object({
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { usuarioId } = bodySchema.parse(request.body);

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { empresaId: true },
      });

      if (!usuario?.empresaId) {
        return reply.status(200).send({
          success: true,
          message: "Usuário não tem empresa, nenhuma notificação de empresa para marcar",
        });
      }

      const notificacoesEmpresa = await prisma.notificacao.findMany({
        where: {
          empresaId: usuario.empresaId,
          NOT: {
            NotificacaoLida: {
              some: { usuarioId },
            },
          },
        },
        select: { id: true },
      });

      await prisma.notificacaoLida.createMany({
        data: notificacoesEmpresa.map((n) => ({
          notificacaoId: n.id,
          usuarioId,
        })),
        skipDuplicates: true,
      });

      return reply.send({
        success: true,
        message: "Todas as notificações de empresa foram marcadas como lidas",
      });
    } catch (error) {
      console.error("Erro ao marcar notificações como lidas:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao marcar notificações como lidas",
      });
    }
  });

  app.get("/notificacoes-lidas/:notificacaoId/:usuarioId", async (request, reply) => {
    const paramsSchema = z.object({
      notificacaoId: z.string().uuid("ID de notificação inválido"),
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { notificacaoId, usuarioId } = paramsSchema.parse(request.params);

    try {
      const registro = await prisma.notificacaoLida.findUnique({
        where: {
          notificacaoId_usuarioId: {
            notificacaoId,
            usuarioId,
          },
        },
      });

      return reply.send({
        success: true,
        lida: !!registro,
      });
    } catch (error) {
      console.error("Erro ao verificar notificação lida:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao verificar notificação lida",
      });
    }
  });

  app.get("/notificacoes-lidas/usuario/:usuarioId", async (request, reply) => {
    const paramsSchema = z.object({
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { usuarioId } = paramsSchema.parse(request.params);

    try {
      const notificacoesLidas = await prisma.notificacaoLida.findMany({
        where: { usuarioId },
        select: { notificacaoId: true },
      });

      return reply.send({
        success: true,
        notificacoesLidas,
      });
    } catch (error) {
      console.error("Erro ao obter notificações lidas:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao obter notificações lidas",
      });
    }
  });

  app.post("/notificacoes-lidas/remover", async (request, reply) => {
    const bodySchema = z.object({
      notificacaoId: z.string().uuid("ID de notificação inválido"),
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { notificacaoId, usuarioId } = bodySchema.parse(request.body);

    try {
      await prisma.notificacaoLida.deleteMany({
        where: {
          notificacaoId,
          usuarioId,
        },
      });

      return reply.send({
        success: true,
        message: "Registro de notificação lida removido com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover registro de notificação lida:", error);
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao remover registro de notificação lida",
      });
    }
  });
}
