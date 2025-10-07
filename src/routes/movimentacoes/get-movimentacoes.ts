import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { calcularSaldoProduto } from "../../lib/estoqueUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getMovimentacoes(app: FastifyInstance) {
  app.get("/movimentacoes-estoque/produto/:produtoId", async (request, reply) => {
    try {
      const userId = request.headers["user-id"] as string;
      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { empresaId: true },
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      const { produtoId } = request.params as { produtoId: string };

      const produto = await prisma.produto.findUnique({
        where: { id: Number(produtoId) },
        select: { empresaId: true },
      });

      if (!produto) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
      }

      if (produto.empresaId !== usuario.empresaId) {
        return reply.status(403).send({ mensagem: "Acesso negado" });
      }

      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: {
          produtoId: Number(produtoId),
          produto: {
            empresaId: usuario.empresaId,
          },
        },
        include: {
          usuario: { select: { nome: true } },
          venda: { include: { cliente: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return reply.send(movimentacoes);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
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
}
