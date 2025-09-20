import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getVendas(app: FastifyInstance) {
  app.get("/venda/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const vendas = await prisma.venda.findMany({
      where: {
        empresaId: idEmpresa,
      },
      include: {
        produto: true,
        cliente: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reply.status(200).send({
      mensagem: "Vendas encontradas com sucesso",
      vendas,
    });
  });

  app.get("/venda/top-produtos/:idEmpresa", async (request, reply) => {
  const { idEmpresa } = request.params as { idEmpresa: string };

  const topProdutos = await prisma.venda.groupBy({
    by: ['produtoId'],
    where: {
      empresaId: idEmpresa,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 5,
  });

  const produtosComNomes = await Promise.all(
    topProdutos.map(async (item) => {
      const produto = await prisma.produto.findUnique({
        where: { id: item.produtoId },
        select: { nome: true }
      });

      return {
        id: item.produtoId,
        nome: produto?.nome || `Produto ${String(item.produtoId).substring(0, 8)}`,
        vendas: item._count.id,
      };
    })
  );

  return reply.status(200).send(produtosComNomes);
});
  app.get("/venda/contagem/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const total = await prisma.venda.aggregate({
      where: {
        empresaId: idEmpresa,
      },
      _sum: {
        valorVenda: true,
      },
      _count: {
        id: true,
      },
    });

    return reply.status(200).send({
      total: total._sum.valorVenda,
      quantidadeVendas: total._count.id,
    });
  });
}
