import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { AccessDeniedException } from "../../exceptions/AccessDeniedException";

export async function createVenda(app: FastifyInstance) {
  app.post("/venda", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;

      const temPermissao = await usuarioTemPermissao(userId, "vendas_realizar");
      if (!temPermissao) throw new AccessDeniedException("Acesso negado");

      const criarVendaBody = z.object({
        empresaId: z.string(),
        produtoId: z.number(),
        quantidade: z.number().min(1),
        valorVenda: z.number().min(0).optional(),
        valorCompra: z.number().min(0),
        usuarioId: z.string().optional(),
        clienteId: z.string().optional().nullable(),
        clienteNome: z.string().optional().nullable(),
      });

      const { empresaId, produtoId, quantidade, valorCompra, usuarioId, clienteId, clienteNome } = criarVendaBody.parse(request.body);

      const result = await prisma.$transaction(async (tx) => {
        const produto = await tx.produto.findUnique({
          where: { id: produtoId },
        });

        if (!produto) {
          throw new Error("Produto não encontrado");
        }

        const movimentacoes = await tx.movimentacaoEstoque.findMany({
          where: { produtoId },
        });

        const saldoAtual = movimentacoes.reduce((total, mov) => {
          return mov.tipo === "ENTRADA" ? total + mov.quantidade : total - mov.quantidade;
        }, 0);

        if (saldoAtual < quantidade) {
          throw new Error("Estoque insuficiente");
        }

        const valorVendaCalculado = produto.preco * quantidade;

        const venda = await tx.venda.create({
          data: {
            empresaId,
            produtoId,
            quantidade,
            valorVenda: valorVendaCalculado,
            valorCompra,
            usuarioId: usuarioId || userId,
            clienteId,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId,
            tipo: "SAIDA",
            quantidade,
            motivo: "VENDA",
            empresaId,
            usuarioId: userId,
            vendaId: venda.id,
          },
        });

        return venda;
      });

      const produto = await prisma.produto.findUnique({
        where: { id: produtoId },
      });

      const clienteInfo = clienteId
        ? await prisma.cliente.findUnique({
            where: { id: clienteId },
          })
        : null;

      await prisma.logs.create({
        data: {
          descricao: JSON.stringify({
            entityType: "vendas",
            action: "produto_vendido",
            produtoNome: produto?.nome || "Produto",
            quantidade: quantidade,
            clienteNome: clienteInfo?.nome || clienteNome || null,
          }),
          tipo: "BAIXA",
          empresaId,
          usuarioId: userId,
        },
      });

      return reply.status(201).send({
        mensagem: "Venda criada com sucesso",
        venda: result,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      if (error instanceof AccessDeniedException) return reply.status(403).send({ error: error.message });
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });
}
