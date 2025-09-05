import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getFornecedor(app: FastifyInstance) {
  app.get("/fornecedor", async (request, reply) => {
    const fornecedor = await prisma.fornecedor.findMany();
    reply.send(fornecedor);
  });

  app.get("/fornecedor/contagem/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const contagem = await prisma.fornecedor.aggregate({
      where: {
        empresaId: empresaId,
      },
      _count: {
        id: true,
      },
    });

    reply.send(contagem);
  });
}
