import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateNotificacao(app: FastifyInstance) {
  app.put("/notificacao/:id", async (request, reply) => {
    const criarNotificacaoBody = z.object({
      titulo: z.string().min(1, "Título é obrigatório"),
      descricao: z.string().min(1, "Descrição é obrigatória"),
      lida: z.boolean().default(false),
      usuarioId: z.string().uuid("ID de usuário inválido"),
    });

    const { id } = request.params as { id: string };
    const { titulo, descricao, lida, usuarioId} = criarNotificacaoBody.parse(request.body);

    const notificacao = await prisma.notificacao.update({
      where: {
        id: String(id),
      },
      data: {
        titulo,
        descricao,
        lida,
        usuario: {
          connect: {
            id: usuarioId,
          },
        },
      },
    });

    reply.send(notificacao);
  });
}