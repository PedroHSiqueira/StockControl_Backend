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
            NotificacaoUsuario: {
              some: { 
                usuarioId,
                lida: true 
              }
            }
          }
        },
        select: { id: true },
      });

      for (const notificacao of notificacoesEmpresa) {
        await prisma.notificacaoUsuario.upsert({
          where: {
            notificacaoId_usuarioId: {
              notificacaoId: notificacao.id,
              usuarioId,
            },
          },
          create: {
            notificacaoId: notificacao.id,
            usuarioId,
            lida: true,
            somTocado: true,
          },
          update: {
            lida: true,
            somTocado: true,
          },
        });
      }

      return reply.send({
        success: true,
        message: "Todas as notificações de empresa foram marcadas como lidas para este usuário",
      });
    } catch (error) {
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
      const registroNovo = await prisma.notificacaoUsuario.findUnique({
        where: {
          notificacaoId_usuarioId: {
            notificacaoId,
            usuarioId,
          },
        },
      });

      if (registroNovo) {
        return reply.send({
          success: true,
          lida: registroNovo.lida,
        });
      }

      const notificacao = await prisma.notificacao.findUnique({
        where: { id: notificacaoId },
        select: { lida: true, empresaId: true },
      });

      if (notificacao && !notificacao.empresaId) {
        return reply.send({
          success: true,
          lida: notificacao.lida,
        });
      }

      return reply.send({
        success: true,
        lida: false,
      });
    } catch (error) {
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
      const notificacoesLidasNovo = await prisma.notificacaoUsuario.findMany({
        where: { 
          usuarioId,
          lida: true 
        },
        select: { notificacaoId: true },
      });

      const notificacoesPessoaisLidas = await prisma.notificacao.findMany({
        where: { 
          usuarioId,
          lida: true 
        },
        select: { id: true },
      });

      const todasNotificacoesLidas = [
        ...notificacoesLidasNovo.map(n => n.notificacaoId),
        ...notificacoesPessoaisLidas.map(n => n.id)
      ];

      return reply.send({
        success: true,
        notificacoesLidas: todasNotificacoesLidas,
      });
    } catch (error) {
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
      await prisma.notificacaoUsuario.deleteMany({
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
      return reply.status(500).send({
        success: false,
        message: "Erro interno ao remover registro de notificação lida",
      });
    }
  });
}
