import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function createConvite(app: FastifyInstance) {
  app.post("/convites", async (request, reply) => {
    const userId = request.headers['user-id'] as string;
          
          if (!userId) {
            return reply.status(401).send({ mensagem: "Usuário não autenticado" });
          }
    
          const temPermissao = await usuarioTemPermissao(userId, "usuarios_criar");
          if (!temPermissao) {
            return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: usuarios_criar" });
          }
    const bodySchema = z.object({
      email: z.string().email(),
      empresaId: z.string().uuid(),
    });

    const { email, empresaId } = bodySchema.parse(request.body);

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    const convite = await prisma.convite.create({
      data: {
        email,
        empresaId,
      },
    });

    if (usuario) {
      await prisma.notificacao.create({
        data: {
          titulo: "Convite para entrar na empresa",
          descricao: "Você recebeu um convite para fazer parte de uma empresa.",
          usuarioId: usuario.id,
          conviteId: convite.id,
        },
      });
    }

    return reply.status(201).send({ convite });
  });
}
