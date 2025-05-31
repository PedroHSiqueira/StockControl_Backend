import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteCliente(app: FastifyInstance) {
  app.delete("/clientes/:id", async (request, reply) => {
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

