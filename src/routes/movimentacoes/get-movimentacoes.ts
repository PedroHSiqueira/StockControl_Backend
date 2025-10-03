import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { calcularSaldoProduto, calcularSaldosProdutos } from "../../lib/estoqueUtils";

export async function getMovimentacoes(app: FastifyInstance) {
  app.get("/movimentacoes-estoque/produto/:produtoId", async (request, reply) => {
    try {
      const { produtoId } = request.params as { produtoId: string };
      
      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: { produtoId: Number(produtoId) },
        include: {
          usuario: { select: { nome: true } },
          venda: { include: { cliente: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return reply.send(movimentacoes);
    } catch (error) {
      console.error("Erro ao buscar movimentações:", error);
      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });

  app.get("/produtos/:id/saldo", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const saldo = await calcularSaldoProduto(Number(id));
      return reply.send({ saldo });
    } catch (error) {
      console.error("Erro ao calcular saldo:", error);
      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });

  app.post("/produtos/saldos", async (request, reply) => {
    try {
      const { produtoIds } = request.body as { produtoIds: number[] };
      
      const saldos = await calcularSaldosProdutos(produtoIds);
      return reply.send(saldos);
    } catch (error) {
      console.error("Erro ao calcular saldos:", error);
      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });
}