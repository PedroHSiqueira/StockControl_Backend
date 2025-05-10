import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getFornecedor(app: FastifyInstance) {
  app.get("/fornecedor", async (request, reply) => {
    const fornecedor = await prisma.fornecedor.findMany();
    reply.send(fornecedor);
  });
}