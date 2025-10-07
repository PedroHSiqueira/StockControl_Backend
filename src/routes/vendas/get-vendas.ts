import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getVendas(app: FastifyInstance) {
  app.get("/venda/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

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
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/venda/top-produtos/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const topProdutos = await prisma.venda.groupBy({
        by: ["produtoId"],
        where: {
          empresaId: idEmpresa,
        },
        _sum: {
          quantidade: true,
        },
        orderBy: {
          _sum: {
            quantidade: "desc",
          },
        },
        take: 5,
      });

      const produtosComNomes = await Promise.all(
        topProdutos.map(async (item) => {
          const produto = await prisma.produto.findUnique({
            where: { id: item.produtoId },
            select: { nome: true },
          });

          return {
            id: item.produtoId.toString(),
            nome: produto?.nome || `Produto ${String(item.produtoId).substring(0, 8)}`,
            vendas: item._sum.quantidade || 0,
          };
        })
      );

      return reply.status(200).send(produtosComNomes);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno ao buscar top produtos" });
    }
  });

  app.get("/venda/contagem/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const total = await prisma.venda.aggregate({
        where: {
          empresaId: idEmpresa,
        },
        _sum: {
          valorVenda: true,
          quantidade: true,
        },
        _count: {
          id: true,
        },
      });

      return reply.status(200).send({
        total: total._sum.valorVenda,
        totalQuantidade: total._sum.quantidade,
        quantidadeVendas: total._count.id,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
