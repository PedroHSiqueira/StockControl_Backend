import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { calcularSaldoProduto } from "../../lib/estoqueUtils";

export async function getProduto(app: FastifyInstance) {
  app.get("/produtos", async (request, reply) => {
    try {
      const produtos = await prisma.produto.findMany({
        include: {
          categoria: true,
          fornecedor: true,
          empresa: true,
          Movimentacoes: true,
        },
      });

      const produtosComSaldo = await Promise.all(
        produtos.map(async (produto) => {
          const saldo = await calcularSaldoProduto(produto.id);

          return {
            ...produto,
            quantidade: saldo
          };
        })
      );

      reply.send(produtosComSaldo);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
      reply.status(500).send({ mensagem: "Erro interno" });
    }
  });

  app.get("/produtos/empresa/:empresaId", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { empresaId } = request.params as { empresaId: string };

    const produtos = await prisma.produto.findMany({
      where: {
        empresaId: empresaId
      },
      include: {
        categoria: true,
        fornecedor: true,
        Movimentacoes: true,
      },
      orderBy: {
        nome: 'asc'
      }
    });

    const produtosComSaldo = await Promise.all(
      produtos.map(async (produto) => {
        const saldo = await calcularSaldoProduto(produto.id);
        return {
          ...produto,
          quantidade: saldo
        };
      })
    );

    reply.send(produtosComSaldo);
  } catch (error) {
    console.error("Erro ao buscar produtos da empresa:", error);
    reply.status(500).send({ mensagem: "Erro interno ao buscar produtos" });
  }
});

 app.get("/produtos/contagem/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };

    try {
      const produtos = await prisma.produto.findMany({
        where: { empresaId },
        include: { 
          categoria: true,
          fornecedor: true 
        }
      });

      const produtosComSaldo = await Promise.all(
        produtos.map(async (produto) => {
          const saldo = await calcularSaldoProduto(produto.id);
          
          return {
            ...produto,
            quantidade: saldo
          };
        })
      );

      const count = produtos.length;
      const contagemQuantidade = produtosComSaldo.reduce((sum, produto) => sum + (produto.quantidade || 0), 0);
      const contagemPreco = produtosComSaldo.reduce((sum, produto) => sum + (produto.preco || 0) * (produto.quantidade || 0), 0);

      reply.send({ contagemQuantidade, contagemPreco, count });
    } catch (error) {
      console.error("Erro ao calcular contagem:", error);
      reply.status(500).send({ mensagem: "Erro interno" });
    }
  });
}