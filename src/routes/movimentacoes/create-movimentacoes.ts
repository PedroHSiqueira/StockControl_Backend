import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { calcularSaldoProduto, calcularSaldosProdutos } from "../../lib/estoqueUtils";

export async function createMovimentacoes(app: FastifyInstance) {
    app.post("/movimentacoes-estoque", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "estoque_gerenciar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { produtoId, tipo, quantidade, motivo, observacao, empresaId, vendaId } = request.body as any;

            const produto = await prisma.produto.findUnique({
                where: { id: produtoId }
            });

            if (!produto) {
                return reply.status(404).send({ mensagem: "Produto não encontrado" });
            }

            if (tipo === 'SAIDA') {
                const saldoAtual = await calcularSaldoProduto(produtoId);
                if (saldoAtual < quantidade) {
                    return reply.status(400).send({
                        mensagem: "Estoque insuficiente",
                        saldoAtual,
                        quantidadeSolicitada: quantidade
                    });
                }
            }

            const movimentacao = await prisma.movimentacaoEstoque.create({
                data: {
                    produtoId,
                    tipo,
                    quantidade,
                    motivo,
                    observacao,
                    empresaId: empresaId || produto.empresaId,
                    usuarioId: userId,
                    vendaId: vendaId || null
                }
            });

            return reply.status(201).send(movimentacao);
        } catch (error) {
            console.error("Erro ao criar movimentação:", error);
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