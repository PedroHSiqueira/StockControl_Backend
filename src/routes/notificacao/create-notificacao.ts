import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createNotificacao(app: FastifyInstance) {
  app.post("/notificacao", async (request, reply) => {
    const criarNotificacaoBody = z.object({
      titulo: z.string().min(1, "Título é obrigatório"),
      descricao: z.string().min(1, "Descrição é obrigatória"),
      lida: z.boolean().default(false),
      usuarioId: z.string().uuid("ID de usuário inválido"), 
      nomeRemetente: z.string().min(1, "Nome do remetente é obrigatório") 
    });

    const { titulo, descricao, lida, usuarioId, nomeRemetente } = criarNotificacaoBody.parse(request.body);

    if (!titulo || !descricao || !usuarioId || !nomeRemetente) {
      reply.status(400).send({ mensagem: "preencha todos os campos por favor" });
      return;
    }

    const notificacao = await prisma.notificacao.create({
      data: {
        titulo,
        descricao: `Enviado por ${nomeRemetente}: ${descricao}`,
        lida,
        usuario: {
          connect: {
            id: usuarioId,
          },
        },
      },
    });

    return reply.status(201).send(notificacao);
  });
}
