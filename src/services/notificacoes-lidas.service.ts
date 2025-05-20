import { prisma } from "../lib/prisma";

export async function marcarComoLida(notificacaoId: string, usuarioId: string) {
  return prisma.notificacaoLida.upsert({
    where: {
      notificacaoId_usuarioId: {
        notificacaoId,
        usuarioId
      }
    },
    create: {
      notificacaoId,
      usuarioId
    },
    update: {}
  });
}

export async function verificarSeLida(notificacaoId: string, usuarioId: string) {
  const registro = await prisma.notificacaoLida.findUnique({
    where: {
      notificacaoId_usuarioId: {
        notificacaoId,
        usuarioId
      }
    }
  });
  return !!registro;
}

export async function obterNotificacoesLidasPorUsuario(usuarioId: string) {
  return prisma.notificacaoLida.findMany({
    where: { usuarioId },
    select: { notificacaoId: true }
  });
}