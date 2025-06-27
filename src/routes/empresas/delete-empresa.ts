import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteEmpresa(app: FastifyInstance) {
  app.delete("/empresa/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { empresa: true },
    });

    if (!usuario) {
      return reply.status(404).send({ mensagem: "Usuário não encontrado" });
    }

    if (!usuario.empresaId) {
      return reply.status(400).send({ mensagem: "Usuário não está vinculado a uma empresa" });
    }

    if (usuario.tipo === "PROPRIETARIO") {
      await prisma.empresa.update({
        where: { id: usuario.empresaId },
        data: {
          ativo: false,
        },
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
  });
}
