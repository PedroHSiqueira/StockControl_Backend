import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateNotificacao(app: FastifyInstance) {
  app.put("/notificacao/:id", async (request, reply) => {
    const criarNotificacaoBody = z.object({
      titulo: z.string().min(1, "Título é obrigatório").optional(),
      descricao: z.string().min(1, "Descrição é obrigatória").optional(),
      lida: z.boolean().optional(),
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { id } = request.params as { id: string };
    const { titulo, descricao, lida, usuarioId } = criarNotificacaoBody.parse(request.body);

    if (id === "marcar-lidas") {
      await prisma.notificacao.updateMany({
        where: {
          usuarioId,
          lida: false,
        },
        data: {
          lida: true,
        },
      });

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { empresaId: true },
      });

      if (usuario?.empresaId) {
        const notificacoesEmpresa = await prisma.notificacao.findMany({
          where: {
            empresaId: usuario.empresaId,
            usuarioId: null,
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
      }

      return reply.send({
        success: true,
        message: "Todas as notificações foram marcadas como lidas.",
      });
    }

    const notificacao = await prisma.notificacao.findUnique({
      where: { id: String(id) },
      include: {
        NotificacaoLida: {
          where: {
            usuarioId,
          },
        },
      },
    });

    if (!notificacao) {
      return reply.status(404).send({
        success: false,
        message: "Notificação não encontrada",
      });
    }

    if (lida !== undefined) {
      if (notificacao.empresaId) {
        if (lida) {
          await prisma.notificacaoLida.upsert({
            where: {
              notificacaoId_usuarioId: {
                notificacaoId: notificacao.id,
                usuarioId,
              },
            },
            create: {
              notificacaoId: notificacao.id,
              usuarioId,
            },
            update: {},
          });
        } else if (notificacao.NotificacaoLida.length > 0) {
          await prisma.notificacaoLida.deleteMany({
            where: {
              notificacaoId: notificacao.id,
              usuarioId,
            },
          });
        }
      } else {
        await prisma.notificacao.update({
          where: { id: String(id) },
          data: { lida },
        });
      }
    }

    if (titulo || descricao) {
      await prisma.notificacao.update({
        where: { id: String(id) },
        data: {
          ...(titulo && { titulo }),
          ...(descricao && { descricao }),
        },
      });
    }

    const notificacaoAtualizada = await prisma.notificacao.findUnique({
      where: { id: String(id) },
      include: {
        NotificacaoLida: {
          where: {
            usuarioId,
          },
        },
      },
    });

    const isLida = notificacaoAtualizada?.empresaId ? notificacaoAtualizada.NotificacaoLida.length > 0 : notificacaoAtualizada?.lida;

    return reply.send({
      ...notificacaoAtualizada,
      lida: isLida,
    });
  });
}
