import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { UserNotFoundError } from "../../exceptions/UserNotFoundException";

export async function deleteEmpresa(app: FastifyInstance) {
  app.delete("/empresa/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { id } = request.params as { id: string };

      const usuario = await prisma.usuario.findUnique({
        where: { id },
        include: { empresa: true },
      });

      if (!usuario) {
        throw new UserNotFoundError("Usuário não encontrado");
      }

      if (!usuario.empresaId) {
        return reply.status(400).send({ mensagem: "Usuário não está vinculado a uma empresa" });
      }

      if (usuario.tipo === "PROPRIETARIO") {
        await prisma.empresa.delete({
          where: { id: usuario.empresaId },
        });
      }

      await prisma.usuario.update({
        where: { id },
        data: {
          tipo: "FUNCIONARIO",
          empresaId: null,
        },
      });

      return reply.status(204).send();
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
