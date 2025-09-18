import { prisma } from "../src/lib/prisma";

async function migrarDadosExistentes() {
  
  const produtos = await prisma.produto.findMany();
  
  for (const produto of produtos) {
    console.log(`Migrando produto: ${produto.nome} (ID: ${produto.id})`);
    
    if (produto.quantidadeMin > 0) {
      await prisma.movimentacaoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: 'ENTRADA',
          quantidade: produto.quantidadeMin,
          motivo: 'MIGRACAO_INICIAL',
          observacao: 'Estoque inicial migrado do sistema antigo',
          empresaId: produto.empresaId!,
          usuarioId: produto.usuarioId || 'system-migration',
        }
      });
    }
    
    const vendas = await prisma.venda.findMany({
      where: { produtoId: produto.id }
    });
    
    for (const venda of vendas) {
      await prisma.movimentacaoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: 'SAIDA',
          quantidade: venda.quantidade,
          motivo: 'VENDA_MIGRADA',
          observacao: `Venda migrada - ID: ${venda.id}`,
          empresaId: venda.empresaId,
          usuarioId: venda.usuarioId || 'system-migration',
          vendaId: venda.id,
        }
      });
    }
  }
  
  console.log("Migração concluída com sucesso!");
}

migrarDadosExistentes()
  .catch(console.error)
  .finally(() => process.exit(0));