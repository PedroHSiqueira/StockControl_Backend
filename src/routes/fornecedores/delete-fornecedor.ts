import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteFornecedor(app: FastifyInstance) {
  app.delete("/fornecedor/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const fornecedor = await prisma.fornecedor.delete({
      where: {
        id: String(id),
      },
    });

    await prisma.logs.create({
      data: {
        descricao: `Fornecedor Deletado: ${fornecedor.nome}`,
        tipo: "EXCLUSAO",
      },
    });
    reply.status(204);
  });
}
