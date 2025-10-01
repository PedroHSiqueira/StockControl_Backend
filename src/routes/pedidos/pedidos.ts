import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { criarPedidoCompleto, atualizarStatusPedido, concluirPedidoComEstoque } from "../../lib/pedidoUtils";

export async function pedidosRoutes(app: FastifyInstance) {
    app.post("/pedidos", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_criar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { fornecedorId, itens, observacoes, empresaId } = request.body as any;

            if (!fornecedorId || !itens || !Array.isArray(itens) || itens.length === 0) {
                return reply.status(400).send({ mensagem: "Dados do pedido inválidos" });
            }

            const resultado = await criarPedidoCompleto(
                fornecedorId,
                itens,
                observacoes,
                empresaId,
                userId
            );

            const fornecedor = await prisma.fornecedor.findUnique({
                where: { id: resultado.pedido.fornecedorId },
                select: { nome: true }
            });

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "pedido_criado",
                        pedidoNumero: resultado.pedido.numero,
                        fornecedorNome: fornecedor?.nome || 'Fornecedor',
                        quantidadeItens: itens.length
                    }),
                    tipo: "CRIACAO",
                    empresaId,
                    usuarioId: userId,
                }
            });

            return reply.status(201).send({
                mensagem: "Pedido criado com sucesso",
                pedido: resultado.pedido,
                itens: resultado.itens
            });
        } catch (error) {
            console.error("Erro ao criar pedido:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.get("/pedidos/empresa/:empresaId", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_visualizar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });
            const { empresaId } = request.params as { empresaId: string };

            const pedidos = await prisma.pedido.findMany({
                where: { empresaId },
                include: {
                    fornecedor: true,
                    usuario: { select: { nome: true } },
                    itens: {
                        include: {
                            produto: {
                                select: { nome: true, foto: true }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const pedidosFormatados = pedidos.map(pedido => ({
                ...pedido,
                dataSolicitacao: pedido.createdAt.toISOString(),
                dataAtualizacao: pedido.updatedAt.toISOString()
            }));

            return reply.send(pedidosFormatados);
        } catch (error) {
            console.error("Erro ao buscar pedidos:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.get("/pedidos/:id", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_visualizar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };

            const pedido = await prisma.pedido.findUnique({
                where: { id },
                include: {
                    fornecedor: true,
                    usuario: { select: { nome: true, email: true } },
                    itens: {
                        include: {
                            produto: {
                                include: {
                                    categoria: true,
                                    fornecedor: true
                                }
                            }
                        }
                    }
                }
            });

            if (!pedido) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            return reply.send(pedido);
        } catch (error) {
            console.error("Erro ao buscar pedido:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.put("/pedidos/:id/status", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };
            const { status } = request.body as any;

            const pedidoExistente = await prisma.pedido.findUnique({
                where: { id },
                include: { empresa: true, fornecedor: true }
            });

            if (!pedidoExistente) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            const pedidoAtualizado = await atualizarStatusPedido(
                id,
                status,
                userId,
                pedidoExistente.empresaId
            );

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "status_atualizado",
                        pedidoNumero: pedidoExistente.numero,
                        statusAnterior: pedidoExistente.status,
                        statusNovo: status,
                        fornecedorNome: pedidoExistente.fornecedor?.nome || 'Fornecedor'
                    }),
                    tipo: "ATUALIZACAO",
                    empresaId: pedidoExistente.empresaId,
                    usuarioId: userId,
                }
            });

            return reply.send({
                mensagem: "Status do pedido atualizado com sucesso",
                pedido: pedidoAtualizado
            });
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.put("/pedidos/:id/itens", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };
            const { itens } = request.body as any;

            const pedido = await prisma.pedido.findUnique({
                where: { id },
                include: { empresa: true, fornecedor: true }
            });

            if (!pedido) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            await Promise.all(
                itens.map((item: any) =>
                    prisma.itemPedido.update({
                        where: { id: item.itemId },
                        data: { quantidadeAtendida: item.quantidadeAtendida }
                    })
                )
            );

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "itens_atualizados",
                        pedidoNumero: pedido.numero,
                        fornecedorNome: pedido.fornecedor?.nome || 'Fornecedor',
                        quantidadeItensAtualizados: itens.length
                    }),
                    tipo: "ATUALIZACAO",
                    empresaId: pedido.empresaId,
                    usuarioId: userId,
                }
            });

            return reply.send({ mensagem: "Itens atualizados com sucesso" });
        } catch (error) {
            console.error("Erro ao atualizar itens:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.post("/pedidos/:id/concluir-com-estoque", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

            const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
            if (!temPermissao) return reply.status(403).send({ mensagem: "Acesso negado" });

            const { id } = request.params as { id: string };
            const { quantidadesRecebidas } = request.body as any;

            const pedidoExistente = await prisma.pedido.findUnique({
                where: { id },
                include: { empresa: true, fornecedor: true }
            });

            if (!pedidoExistente) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            const pedidoAtualizado = await concluirPedidoComEstoque(
                id,
                quantidadesRecebidas,
                userId,
                pedidoExistente.empresaId
            );

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "pedido_concluido_estoque",
                        pedidoNumero: pedidoExistente.numero,
                        fornecedorNome: pedidoExistente.fornecedor?.nome || 'Fornecedor',
                        statusFinal: pedidoAtualizado.status
                    }),
                    tipo: "ATUALIZACAO",
                    empresaId: pedidoExistente.empresaId,
                    usuarioId: userId,
                }
            });

            return reply.send({
                mensagem: "Pedido concluído e estoque atualizado com sucesso",
                pedido: pedidoAtualizado
            });
        } catch (error) {
            console.error("Erro ao concluir pedido com estoque:", error);
            return reply.status(500).send({ mensagem: "Erro interno no servidor" });
        }
    });

    app.post("/pedidos/:id/registrar-email", async (request, reply) => {
        try {
            const userId = request.headers['user-id'] as string;
            const { id } = request.params as { id: string };

            const pedido = await prisma.pedido.findUnique({
                where: { id },
                include: { fornecedor: true, empresa: true }
            });

            if (!pedido) {
                return reply.status(404).send({ mensagem: "Pedido não encontrado" });
            }

            await prisma.logs.create({
                data: {
                    descricao: JSON.stringify({
                        entityType: "pedidos",
                        action: "email_enviado_fornecedor",
                        pedidoNumero: pedido.numero,
                        fornecedorNome: pedido.fornecedor.nome,
                        fornecedorEmail: pedido.fornecedor.email
                    }),
                    tipo: "EMAIL_ENVIADO",
                    empresaId: pedido.empresaId,
                    usuarioId: userId,
                }
            });

            return reply.send({ mensagem: "Registro de email criado" });
        } catch (error) {
            console.error("Erro ao registrar email:", error);
            return reply.status(500).send({ mensagem: "Erro interno" });
        }
    });
}