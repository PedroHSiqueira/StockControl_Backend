import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getNotificacao(app: FastifyInstance) {
  app.get("/notificacao", async (request, reply) => {
    const notificacao = await prisma.notificacao.findMany({
      include: {
        convite: {
          include: {
            empresa: true,
          },
        },
        usuario: {
          select: {
            id: true,
            nome: true,
          },
        },
        NotificacaoLida: true,
        NotificacaoUsuario: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    reply.send(notificacao);
  });

  app.get("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: { empresaId: true },
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      const notificacoes = await prisma.notificacao.findMany({
        where: {
          OR: [
            { usuarioId: id },
            { 
              empresaId: usuario.empresaId,
              usuarioId: null
            }
          ],
        },
        include: {
          convite: {
            include: {
              empresa: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nome: true,
            },
          },
          NotificacaoLida: {
            where: {
              usuarioId: id,
            },
          },
          NotificacaoUsuario: {
            where: {
              usuarioId: id,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const notificacoesComStatus = notificacoes.map((notificacao) => {
        if (notificacao.empresaId) {
          const notificacaoUsuario = notificacao.NotificacaoUsuario[0];
          return {
            ...notificacao,
            lida: notificacaoUsuario?.lida || false,
            somTocado: notificacaoUsuario?.somTocado || false
          };
        } else {
          return {
            ...notificacao,
            lida: notificacao.lida,
            somTocado: false
          };
        }
      });

      reply.send(notificacoesComStatus);
    } catch (error) {
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.post("/notificacao/:id/marcar-som-tocado", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { usuarioId } = request.body as { usuarioId: string };

    try {
      const notificacao = await prisma.notificacao.findUnique({
        where: { id },
        select: { empresaId: true }
      });

      if (notificacao?.empresaId) {
        await prisma.notificacaoUsuario.upsert({
          where: {
            notificacaoId_usuarioId: {
              notificacaoId: id,
              usuarioId: usuarioId
            }
          },
          create: {
            notificacaoId: id,
            usuarioId: usuarioId,
            somTocado: true,
            lida: false
          },
          update: {
            somTocado: true
          }
        });
      }

      return reply.send({ success: true });
    } catch (error) {
      return reply.status(500).send({ success: false, message: "Erro interno" });
    }
  });
}
