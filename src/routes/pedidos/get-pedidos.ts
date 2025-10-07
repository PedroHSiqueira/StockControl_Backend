import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { AccessDeniedException } from "../../exceptions/AccessDeniedException";
import { OrderNotFoundException } from "../../exceptions/OrderNotFound";

export async function getpedidos(app: FastifyInstance) {
  app.get("/pedidos/empresa/:empresaId", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;
      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "pedidos_visualizar");
      if (!temPermissao) throw new AccessDeniedException("Acesso negado");

      const { empresaId } = request.params as { empresaId: string };

      const pedidos = await prisma.pedido.findMany({
        where: { empresaId },
        include: {
          fornecedor: true,
          usuario: { select: { nome: true } },
          itens: {
            include: {
              produto: {
                select: { nome: true, foto: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const pedidosFormatados = pedidos.map((pedido) => ({
        ...pedido,
        dataSolicitacao: pedido.createdAt.toISOString(),
        dataAtualizacao: pedido.updatedAt.toISOString(),
      }));

      return reply.send(pedidosFormatados);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      if (error instanceof AccessDeniedException) {
        return reply.status(403).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/pedidos/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const userId = request.headers["user-id"] as string;
      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "pedidos_visualizar");
      if (!temPermissao) throw new AccessDeniedException("Acesso negado");

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
                  fornecedor: true,
                },
              },
            },
          },
        },
      });

      if (!pedido) {
        throw new OrderNotFoundException("Pedido não encontrado");
      }

      return reply.send(pedido);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      if (error instanceof AccessDeniedException) return reply.status(403).send({ error: error.message });
      if (error instanceof OrderNotFoundException) return reply.status(404).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
