import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getProduto(app: FastifyInstance) {
  app.get("/produtos", async (request, reply) => {
    const fornecedor = await prisma.produto.findMany({
      include: {
        categoria: true,
        fornecedor: true,
        empresa: true,
      },
    });

    reply.send(fornecedor);
  });

  app.get("/produtos/contagem/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };

    const produtos = await prisma.produto.findMany({
      where: {
        empresaId: empresaId,
      },
      select: {
        quantidade: true,
        preco: true,
      },
    });

    const count = await prisma.produto.count({
      where: {
        empresaId: empresaId,
      },
    });

    if (!produtos.length) {
      return reply.status(404).send({ message: "Nenhum produto encontrado para a empresa especificada." });
    }

    const contagemQuantidade = produtos.reduce((sum, produto) => sum + (produto.quantidade || 0), 0);
    const contagemPreco = produtos.reduce((sum, produto) => sum + (produto.preco || 0) * (produto.quantidade || 0), 0);

    reply.send({ contagemQuantidade, contagemPreco, count });
  });
}
