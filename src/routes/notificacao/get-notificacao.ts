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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    reply.send(notificacao);
  });

  app.get("/notificacao/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: { empresaId: true },
    });

    const notificacoes = await prisma.notificacao.findMany({
      where: {
        OR: [{ usuarioId: id }, { empresaId: usuario?.empresaId }],
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const notificacoesComStatus = notificacoes.map((notificacao) => {
      return {
        ...notificacao,
        lida: notificacao.empresaId ? notificacao.NotificacaoLida.length > 0 : notificacao.lida,
      };
    });

    reply.send(notificacoesComStatus);
  });
}
