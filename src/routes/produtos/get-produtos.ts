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

  app.get("/produtos/contagem", async (request, reply) => {
    const produtos = await prisma.produto.findMany({
      select: {
        quantidade: true,
        preco: true,
      },
    });

    const contagemQuantidade = produtos.reduce((sum, produto) => sum + (produto.quantidade || 0), 0);
    const contagemPreco = produtos.reduce((sum, produto) => sum + (produto.preco || 0) * (produto.quantidade || 0), 0);

    reply.send({ contagemQuantidade, contagemPreco });
  });
}

