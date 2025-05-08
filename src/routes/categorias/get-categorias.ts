import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getCategorias(app: FastifyInstance) {
  app.get("/categorias", async (request, reply) => {
    const categorias = await prisma.categoria.findMany();
    
    reply.send(categorias);
  });
}