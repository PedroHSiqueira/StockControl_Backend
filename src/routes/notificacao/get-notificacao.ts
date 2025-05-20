import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { obterNotificacoesLidasPorUsuario } from "../../services/notificacoes-lidas.service";

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
      select: { empresaId: true }
    });

    const notificacoes = await prisma.notificacao.findMany({
      where: {
        OR: [
          { usuarioId: id }, 
          { empresaId: usuario?.empresaId } 
        ]
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const notificacoesLidas = await obterNotificacoesLidasPorUsuario(id);
    const notificacoesLidasIds = notificacoesLidas.map(n => n.notificacaoId);

    const notificacoesComStatus = notificacoes.map(notificacao => {
      if (notificacao.empresaId) {
        return {
          ...notificacao,
          lida: notificacoesLidasIds.includes(notificacao.id)
        };
      }
      return notificacao;
    });

    reply.send(notificacoesComStatus);
  });
}