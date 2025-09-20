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
        empresaId,
        usuarioId,
        descricao: `Pedido criado: ${pedido.numero} para ${itens.length} produtos`,
        tipo: 'CRIACAO'
      }
    });

    return { pedido, itens: itensPedido };
  });
}

export async function concluirPedidoComEstoque(
  pedidoId: string,
  quantidadesRecebidas: Record<string, number>, 
  usuarioId: string,
  empresaId: string
) {
  return await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.update({
      where: { id: pedidoId },
      data: { status: 'CONCLUIDO' },
      include: { itens: true }
    });

    for (const item of pedido.itens) {
      const quantidadeRecebida = quantidadesRecebidas[item.id] || item.quantidadeSolicitada;
      
      if (quantidadeRecebida > 0) {
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: item.produtoId,
            tipo: 'ENTRADA',
            quantidade: quantidadeRecebida,
            motivo: 'PEDIDO_CONCLUIDO',
            observacao: `Entrada por pedido ${pedido.numero}`,
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
        empresaId,
        usuarioId,
        descricao: `Pedido ${pedido.numero} concluído com atualização de estoque`,
        tipo: 'ATUALIZACAO'
      }
    });

    return pedido;
  });
}
export async function atualizarStatusPedido(
  pedidoId: string,
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'CANCELADO',
  usuarioId: string,
  empresaId: string
) {
  return await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.update({
      where: { id: pedidoId },
      data: { status },
      include: {
        itens: {
          include: {
            produto: true
          }
        }
      }
    });

    if (status === 'CONCLUIDO') {
      for (const item of pedido.itens) {
        if (item.quantidadeAtendida > 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'ENTRADA',
              quantidade: item.quantidadeAtendida,
              motivo: 'PEDIDO_CONCLUIDO',
              observacao: `Entrada por pedido ${pedido.numero}`,
              empresaId,
              usuarioId
            }
          });
        }
      }
    } else if (status === 'CANCELADO') {
      for (const item of pedido.itens) {
        if (item.quantidadeAtendida > 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: item.produtoId,
              tipo: 'SAIDA',
              quantidade: item.quantidadeAtendida,
              motivo: 'PEDIDO_CANCELADO',
              observacao: `Cancelamento do pedido ${pedido.numero}`,
              empresaId,
              usuarioId
            }
          });
        }
      }
    }

    await tx.logs.create({
      data: {
        empresaId,
        usuarioId,
        descricao: `Pedido ${pedido.numero} atualizado para status: ${status}`,
        tipo: 'ATUALIZACAO'
      }
    });

    return pedido;
  });
}