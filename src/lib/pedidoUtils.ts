import { prisma } from "./prisma";

export interface ItemPedido {
    produtoId: number;
    quantidade: number;
    precoUnitario: number;
    observacao?: string;
}

export async function criarPedidoCompleto(
    fornecedorId: string,
    itens: ItemPedido[],
    observacoes: string,
    empresaId: string,
    usuarioId: string
) {
    return await prisma.$transaction(async (tx) => {
        const total = itens.reduce((sum, item) => sum + (item.precoUnitario * item.quantidade), 0);

        const fornecedor = await tx.fornecedor.findUnique({
            where: { id: fornecedorId },
            select: { nome: true }
        });

        const pedido = await tx.pedido.create({
            data: {
                numero: `PED-${Date.now()}`,
                fornecedorId,
                empresaId,
                usuarioId,
                observacoes,
                total,
                status: 'PENDENTE'
            }
        });

        const itensPedido = await Promise.all(
            itens.map(item =>
                tx.itemPedido.create({
                    data: {
                        pedidoId: pedido.id,
                        produtoId: item.produtoId,
                        quantidadeSolicitada: item.quantidade,
                        quantidadeAtendida: 0,
                        precoUnitario: item.precoUnitario,
                        observacao: item.observacao
                    },
                    include: { produto: true }
                })
            )
        );

        await tx.logs.create({
            data: {
                descricao: JSON.stringify({
                    entityType: "pedidos",
                    action: "pedido_criado",
                    pedidoNumero: pedido.numero,
                    fornecedorNome: fornecedor?.nome || 'Fornecedor',
                    quantidadeItens: itens.length
                }),
                tipo: "CRIACAO",
                empresaId,
                usuarioId: usuarioId,
            }
        });

        return { pedido, itens: itensPedido };
    });
}

export async function concluirPedidoComEstoque(
    pedidoId: string,
    quantidadesRecebidas: Record<string, number>,
    usuarioId: string,
    empresaId: string,
    idioma: string = 'pt'
) {
    return await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedido.findUnique({
            where: { id: pedidoId },
            include: { itens: true, fornecedor: true }
        });

        if (!pedido) {
            throw new Error("Pedido não encontrado");
        }

        const pedidoAtualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: { status: 'CONCLUIDO' }
        });

        for (const item of pedido.itens) {
            const quantidadeRecebida = quantidadesRecebidas[item.id] || item.quantidadeSolicitada;

            if (quantidadeRecebida > 0) {
                const observacao = idioma === 'en'
                    ? `Order entry ${pedido.numero}`
                    : `Entrada por pedido ${pedido.numero}`;

                await tx.movimentacaoEstoque.create({
                    data: {
                        produtoId: item.produtoId,
                        tipo: 'ENTRADA',
                        quantidade: quantidadeRecebida,
                        motivo: 'PEDIDO_CONCLUIDO',
                        observacao: observacao,
                        empresaId,
                        usuarioId
                    }
                });

                await tx.itemPedido.update({
                    where: { id: item.id },
                    data: { quantidadeAtendida: quantidadeRecebida }
                });
            }
        }

        await tx.logs.create({
            data: {
                descricao: JSON.stringify({
                    entityType: "pedidos",
                    action: "pedido_concluido_estoque",
                    pedidoNumero: pedido.numero,
                    fornecedorNome: pedido.fornecedor?.nome || 'Fornecedor',
                    statusFinal: 'CONCLUIDO'
                }),
                tipo: "ATUALIZACAO",
                empresaId,
                usuarioId: usuarioId,
            }
        });

        return pedidoAtualizado;
    });
}

export async function atualizarStatusPedido(
    pedidoId: string,
    status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'CANCELADO',
    usuarioId: string,
    empresaId: string,
    idioma: string = 'pt'
) {
    return await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedido.findUnique({
            where: { id: pedidoId },
            include: {
                itens: {
                    include: {
                        produto: true
                    }
                },
                fornecedor: true
            }
        });

        if (!pedido) {
            throw new Error("Pedido não encontrado");
        }

        const pedidoAtualizado = await tx.pedido.update({
            where: { id: pedidoId },
            data: { status }
        });

        if (status === 'CONCLUIDO') {
            for (const item of pedido.itens) {
                if (item.quantidadeAtendida > 0) {
                    const observacao = idioma === 'en'
                        ? `Order entry ${pedido.numero}`
                        : `Entrada por pedido ${pedido.numero}`;

                    await tx.movimentacaoEstoque.create({
                        data: {
                            produtoId: item.produtoId,
                            tipo: 'ENTRADA',
                            quantidade: item.quantidadeAtendida,
                            motivo: 'PEDIDO_CONCLUIDO',
                            observacao: observacao,
                            empresaId,
                            usuarioId
                        }
                    });
                }
            }
        } else if (status === 'CANCELADO') {
            for (const item of pedido.itens) {
                if (item.quantidadeAtendida > 0) {
                    const observacao = idioma === 'en'
                        ? `Order cancellation ${pedido.numero}`
                        : `Cancelamento do pedido ${pedido.numero}`;

                    await tx.movimentacaoEstoque.create({
                        data: {
                            produtoId: item.produtoId,
                            tipo: 'SAIDA',
                            quantidade: item.quantidadeAtendida,
                            motivo: 'PEDIDO_CANCELADO',
                            observacao: observacao,
                            empresaId,
                            usuarioId
                        }
                    });
                }
            }
        }

        await tx.logs.create({
            data: {
                descricao: JSON.stringify({
                    entityType: "pedidos",
                    action: "status_atualizado",
                    pedidoNumero: pedido.numero,
                    statusAnterior: pedido.status,
                    statusNovo: status,
                    fornecedorNome: pedido.fornecedor?.nome || 'Fornecedor'
                }),
                tipo: "ATUALIZACAO",
                empresaId,
                usuarioId: usuarioId,
            }
        });

        return pedidoAtualizado;
    });
}