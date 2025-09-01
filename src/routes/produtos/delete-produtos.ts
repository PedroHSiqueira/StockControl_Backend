import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function deleteProduto(app: FastifyInstance) {
  app.delete("/produtos/:id", async (request, reply) => {
    try {
      const userId = request.headers['user-id'] as string;
      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "produtos_excluir");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_excluir" });
      }

      const { id } = request.params as { id: string };
      
      const produtoId = parseInt(id);
      if (isNaN(produtoId)) {
        return reply.status(400).send({ mensagem: "ID do produto inválido" });
      }

      const produto = await prisma.produto.findUnique({
        where: { id: produtoId },
      });

      if (!produto) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { empresaId: true }
      });

      if (!usuario || usuario.empresaId !== produto.empresaId) {
        return reply.status(403).send({ mensagem: "Acesso negado ao produto" });
      }

      const vendasVinculadas = await prisma.venda.findMany({
        where: { produtoId: produtoId }
      });

      if (vendasVinculadas.length > 0) {
        await prisma.venda.deleteMany({
          where: { produtoId: produtoId }
        });

        await prisma.logs.create({
          data: {
            descricao: `Vendas excluídas automaticamente para o produto: ${produto.nome} (${vendasVinculadas.length} vendas)`,
            tipo: "EXCLUSAO",
            empresaId: produto.empresaId,
            usuarioId: userId,
          }
        });
      }

      await prisma.produto.delete({
        where: { id: produtoId },
      });

      await prisma.logs.create({
        data: {
          descricao: `Produto Excluído: ${produto.nome}`,
          tipo: "EXCLUSAO",
          empresaId: produto.empresaId,
          usuarioId: userId, 
        }
      });

      return reply.status(200).send({ 
        mensagem: `Produto excluído com sucesso. ${vendasVinculadas.length > 0 ? `${vendasVinculadas.length} venda(s) vinculada(s) também foram excluída(s).` : ''}`
      });
      
    } catch (error: any) {
      console.error("Erro ao excluir produto:", error);
      
      if (error.code === 'P2003') {
        return reply.status(409).send({ 
          mensagem: "Não foi possível excluir todas as relações do produto. Contate o administrador." 
        });
      }
      
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}