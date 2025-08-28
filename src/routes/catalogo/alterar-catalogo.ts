import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";

export async function toggleCatalogo(app: FastifyInstance) {
  app.put("/empresa/:id/catalogo", async (request: FastifyRequest, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { catalogoPublico } = request.body as { catalogoPublico: boolean };

      const empresa = await prisma.empresa.update({
        where: { id },
        data: { catalogoPublico }
      });

      return reply.send(empresa);
    } catch (error) {
      console.error("Erro ao atualizar catálogo:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor"
      });
    }
  });
}