import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function deleteCliente(app: FastifyInstance) {
  app.delete("/clientes/:id", async (request, reply) => {
    const userId = request.headers['user-id'] as string;

    if (!userId) {
      return reply.status(401).send({ mensagem: "Usuário não autenticado" });
    }

    const temPermissao = await usuarioTemPermissao(userId, "clientes_excluir");
    if (!temPermissao) {
      return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: clientes_excluir" });
    }
    const { id } = request.params as { id: string };

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return reply.status(404).send({ mensagem: "Cliente não encontrado." });
    }

    await prisma.cliente.delete({
      where: { id },
    });

    reply.status(200).send({ mensagem: "Cliente deletado com sucesso!" });
  });
}

