import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function deleteProduto(app: FastifyInstance) {
  app.delete("/produtos/:id", async (request, reply) => {
    const { id } = request.params as { id: Number };

    const produtoExcluido = await prisma.produto.findUnique({
      where: {
        id: Number(id),
      },
    })
    const produto = await prisma.produto.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!produto) {
      return reply.status(404).send({ mensagem: "O Produto não foi encontrado" });
    }

    await prisma.produto.delete({
      where: {
        id: Number(id),
      },
    });

    await prisma.logs.create({
      data: {
        descricao: `Produto Excluido: ${produtoExcluido?.nome}`,
        tipo: "EXCLUSAO" as const,
        empresaId: produto.empresaId,
        usuarioId: produto.usuarioId,
      }
    });
    reply.status(204);
  });
}
