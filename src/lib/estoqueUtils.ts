import { prisma } from "./prisma";

export async function calcularSaldoProduto(produtoId: number): Promise<number> {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: { produtoId }
  });

  return movimentacoes.reduce((total, mov) => {
    return mov.tipo === 'ENTRADA' 
      ? total + mov.quantidade 
      : total - mov.quantidade;
  }, 0);
}

export async function calcularSaldosProdutos(produtoIds: number[]): Promise<Record<number, number>> {
  const movimentacoes = await prisma.movimentacaoEstoque.findMany({
    where: { produtoId: { in: produtoIds } }
  });

  const saldos: Record<number, number> = {};
  
  produtoIds.forEach(id => {
    saldos[id] = movimentacoes
      .filter(mov => mov.produtoId === id)
      .reduce((total, mov) => {
        return mov.tipo === 'ENTRADA' 
          ? total + mov.quantidade 
          : total - mov.quantidade;
      }, 0);
  });

  return saldos;
}