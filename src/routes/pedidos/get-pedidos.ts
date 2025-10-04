import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedError";

export async function getpedidos(app: FastifyInstance) {

  app.get("/pedidos/empresa/:empresaId", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;
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
      console.error("Erro ao buscar pedidos:", error);
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/pedidos/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const userId = request.headers["user-id"] as string;
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
                  fornecedor: true,
                },
              },
            },
          },
        },
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
}
