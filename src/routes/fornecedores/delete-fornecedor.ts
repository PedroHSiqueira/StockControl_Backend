import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function deleteFornecedor(app: FastifyInstance) {
  app.delete("/fornecedor/:id", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;
      const { id } = request.params as { id: string };

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "fornecedores_excluir");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: fornecedores_excluir" });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: { empresa: true },
      });

      if (!usuario || !usuario.empresaId) {
        return reply.status(404).send({ mensagem: "Usuário ou empresa não encontrados" });
      }

      const fornecedor = await prisma.fornecedor.findUnique({
        where: { id },
      });

      if (!fornecedor) {
        return reply.status(404).send({ mensagem: "Fornecedor não encontrado" });
      }

      if (fornecedor.empresaId !== usuario.empresaId) {
        return reply.status(403).send({ mensagem: "Acesso negado. Fornecedor não pertence à sua empresa" });
      }

      const produtosVinculados = await prisma.produto.findMany({
        where: { fornecedorId: id },
      });

      if (produtosVinculados.length > 0) {
        return reply.status(400).send({
          mensagem: "Não é possível excluir o fornecedor pois existem produtos vinculados a ele",
          produtosCount: produtosVinculados.length,
        });
      }

      await prisma.fornecedor.delete({
        where: { id },
      });

      await prisma.logs.create({
        data: {
          descricao: `Fornecedor excluído: ${fornecedor.nome}`,
          tipo: "EXCLUSAO",
          usuarioId: userId,
          empresaId: usuario.empresaId,
        },
      });

      return reply.status(200).send({ mensagem: "Fornecedor excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}
