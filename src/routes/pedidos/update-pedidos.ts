import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedError";
import { atualizarStatusPedido } from "../../lib/pedidoUtils";

export async function updatepedidos(app: FastifyInstance) {

    app.put("/pedidos/:id/status", async (request, reply) => {
        try {
            await request.jwtVerify().catch(() => {
                throw new UnauthorizedError("Token inválido ou expirado");
            });
            const userId = request.headers["user-id"] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };
            const { status } = request.body as any;

            const pedidoExistente = await prisma.pedido.findUnique({
                where: { id },
                include: { empresa: true, fornecedor: true },
            });

            if (!pedidoExistente) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            const pedidoAtualizado = await atualizarStatusPedido(id, status, userId, pedidoExistente.empresaId);

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "status_atualizado",
                        pedidoNumero: pedidoExistente.numero,
                        statusAnterior: pedidoExistente.status,
                        statusNovo: status,
                        fornecedorNome: pedidoExistente.fornecedor?.nome || "Fornecedor",
                    }),
                    tipo: "ATUALIZACAO",
                    empresaId: pedidoExistente.empresaId,
                    usuarioId: userId,
                },
            });

            return reply.send({
                mensagem: "Status do pedido atualizado com sucesso",
                pedido: pedidoAtualizado,
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.put("/pedidos/:id/itens", async (request, reply) => {
        try {
            await request.jwtVerify().catch(() => {
                throw new UnauthorizedError("Token inválido ou expirado");
            });
            const userId = request.headers["user-id"] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };
            const { itens } = request.body as any;

            const pedido = await prisma.pedido.findUnique({
                where: { id },
                include: { empresa: true, fornecedor: true },
            });

            if (!pedido) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            await Promise.all(
                itens.map((item: any) =>
                    prisma.itemPedido.update({
                        where: { id: item.itemId },
                        data: { quantidadeAtendida: item.quantidadeAtendida },
                    })
                )
            );

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "itens_atualizados",
                        pedidoNumero: pedido.numero,
                        fornecedorNome: pedido.fornecedor?.nome || "Fornecedor",
                        quantidadeItensAtualizados: itens.length,
                    }),
                    tipo: "ATUALIZACAO",
                    empresaId: pedido.empresaId,
                    usuarioId: userId,
                },
            });

            return reply.send({ mensagem: "Itens atualizados com sucesso" });
        } catch (error) {
            console.error("Erro ao atualizar itens:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });
}