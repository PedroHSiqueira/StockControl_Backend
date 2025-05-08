import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getProduto(app: FastifyInstance) {
  app.get("/produtos", async (request, reply) => {
    const fornecedor = await prisma.produto.findMany(
      {
        include: {
          categoria: true,
          fornecedor: true,
          empresa: true
        },
      }
    );

    reply.send(fornecedor);
  });
}