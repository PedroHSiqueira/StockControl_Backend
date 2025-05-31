import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getCliente(app: FastifyInstance) {
  app.get("/clientes", async (request, reply) => {
    const clientes = await prisma.cliente.findMany({
      include: {
        empresa: true,
      },
    });

    if (clientes.length === 0) {
      return reply.status(404).send({ mensagem: "Nenhum cliente encontrado." });
    }

    reply.status(200).send({ clientes });
  });
}
