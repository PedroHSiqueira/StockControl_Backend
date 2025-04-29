import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getEmpresa(app: FastifyInstance) {
  app.get("/empresa", async (request, reply) => {
    const empresas = await prisma.empresa.findMany();

    reply.send(empresas);
  });
}