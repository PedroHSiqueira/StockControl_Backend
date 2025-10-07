import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { AccessDeniedException } from "../../exceptions/AccessDeniedException";
import { ProductNotFoundException } from "../../exceptions/ProductNotFound";

export async function deleteProduto(app: FastifyInstance) {
  app.delete("/produtos/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const userId = request.headers["user-id"] as string;
      if (!userId) {
        throw new UnauthorizedError("Usuário não autenticado");
      }

      const temPermissao = await usuarioTemPermissao(userId, "produtos_excluir");
      if (!temPermissao) {
        throw new AccessDeniedException("Acesso negado. Permissão necessária: produtos_excluir");
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
        throw new ProductNotFoundException("Produto não encontrado");
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { empresaId: true },
      });

      if (!usuario || usuario.empresaId !== produto.empresaId) {
        throw new UnauthorizedError("Usuário não autorizado");
      }

      const movimentacoesVinculadas = await prisma.movimentacaoEstoque.findMany({
        where: { produtoId: produtoId },
      });

      if (movimentacoesVinculadas.length > 0) {
        await prisma.movimentacaoEstoque.deleteMany({
          where: { produtoId: produtoId },
        });

        await prisma.logs.create({
          data: {
            descricao: `Movimentações de estoque excluídas automaticamente para o produto: ${produto.nome} (${movimentacoesVinculadas.length} movimentações)`,
            tipo: "EXCLUSAO",
            empresaId: produto.empresaId,
            usuarioId: userId,
          },
        });
      }

      const vendasVinculadas = await prisma.venda.findMany({
        where: { produtoId: produtoId },
      });

      if (vendasVinculadas.length > 0) {
        await prisma.venda.deleteMany({
          where: { produtoId: produtoId },
        });

        await prisma.logs.create({
          data: {
            descricao: `Vendas excluídas automaticamente para o produto: ${produto.nome} (${vendasVinculadas.length} vendas)`,
            tipo: "EXCLUSAO",
            empresaId: produto.empresaId,
            usuarioId: userId,
          },
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
        },
      });

      return reply.status(200).send({
        mensagem: `Produto excluído com sucesso. 
                  ${movimentacoesVinculadas.length > 0 ? `${movimentacoesVinculadas.length} movimentação(ões) de estoque também foram excluída(s).` : ""}
                  ${vendasVinculadas.length > 0 ? `${vendasVinculadas.length} venda(s) vinculada(s) também foram excluída(s).` : ""}`.trim(),
      });
    } catch (error: any) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      if (error instanceof AccessDeniedException) return reply.status(403).send({ error: error.message });
      if (error instanceof ProductNotFoundException) return reply.status(404).send({ error: error.message });

      if (error.code === "P2003") {
        return reply.status(409).send({
          mensagem: "Não foi possível excluir todas as relações do produto. Contate o administrador.",
        });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
