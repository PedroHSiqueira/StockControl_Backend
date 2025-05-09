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

      return reply.send({ message: "Todas as notificações foram marcadas como lidas." });
    }

    const notificacao = await prisma.notificacao.update({
      where: {
        id: String(id),
      },
      data: {
        ...(titulo && { titulo }),
        ...(descricao && { descricao }),
        ...(lida !== undefined && { lida }),
        usuario: {
          connect: {
            id: usuarioId,
          },
        },
      },
    });

    return reply.send(notificacao);
  });
}
