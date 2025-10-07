import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UserNotFoundError } from "../../exceptions/UserNotFoundException";

export async function updatePermissoes(app: FastifyInstance) {
  app.put("/usuarios/:userId/permissoes", async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { permissoes, ativarPersonalizacao } = request.body as {
        permissoes: { permissaoId: string; concedida: boolean }[];
        ativarPersonalizacao: boolean;
      };

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
      });

      if (!usuario) {
        throw new UserNotFoundError("Usuário não encontrado");
      }

      if (ativarPersonalizacao !== undefined) {
        await prisma.usuario.update({
          where: { id: userId },
          data: { permissoesPersonalizadas: ativarPersonalizacao },
        });
      }

      for (const permissao of permissoes) {
        await prisma.usuarioPermissao.upsert({
          where: {
            usuarioId_permissaoId: {
              usuarioId: userId,
              permissaoId: permissao.permissaoId,
            },
          },
          update: { concedida: permissao.concedida },
          create: {
            usuarioId: userId,
            permissaoId: permissao.permissaoId,
            concedida: permissao.concedida,
          },
        });
      }

      return reply.send({
        mensagem: "Permissões atualizadas com sucesso",
        permissoesPersonalizadas: ativarPersonalizacao,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) return reply.status(404).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
