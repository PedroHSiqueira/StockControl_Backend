import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { atualizarStatusPedido } from "../../lib/pedidoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { AccessDeniedException } from "../../exceptions/AccessDeniedException";
import { ProductNotFoundException } from "../../exceptions/ProductNotFound";

export async function updatepedidos(app: FastifyInstance) {
  app.put("/pedidos/:id/status", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const userId = request.headers["user-id"] as string;
      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
      if (!temPermissao) throw new AccessDeniedException("Acesso negado");

      const { id } = request.params as { id: string };
      const { status } = request.body as any;

      const pedidoExistente = await prisma.pedido.findUnique({
        where: { id },
        include: { empresa: true, fornecedor: true },
      });

      if (!pedidoExistente) {
        throw new ProductNotFoundException("Pedido não encontrado");
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
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      if (error instanceof AccessDeniedException) return reply.status(403).send({ error: error.message });
      if (error instanceof ProductNotFoundException) return reply.status(404).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.put("/pedidos/:id/itens", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const userId = request.headers["user-id"] as string;
      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "pedidos_editar");
      if (!temPermissao) throw new AccessDeniedException("Acesso negado");

      const { id } = request.params as { id: string };
      const { itens } = request.body as any;

      const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: { empresa: true, fornecedor: true },
      });

      if (!pedido) {
        throw new ProductNotFoundException("Pedido não encontrado");
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
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      if (error instanceof AccessDeniedException) return reply.status(403).send({ error: error.message });
      if (error instanceof ProductNotFoundException) return reply.status(404).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
