import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getLogs(app: FastifyInstance) {
  app.get("/logs", async (request, reply) => {
    await request.jwtVerify().catch(() => {
      throw new UnauthorizedError("Token inválido ou expirado");
    });

    const {
      page = "1",
      limit = "15",
      empresaId,
    } = request.query as {
      page?: string;
      limit?: string;
      empresaId?: string;
    };

    if (!empresaId) {
      return reply.status(400).send({ error: "empresaId é obrigatório" });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1) {
      return reply.status(400).send({ error: "Parâmetros de paginação inválidos" });
    }

    const skip = (pageNum - 1) * limitNum;

    try {
      const [logs, total] = await Promise.all([
        prisma.logs.findMany({
          where: {
            empresaId: empresaId,
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: "desc" },
        }),
        prisma.logs.count({
          where: {
            empresaId: empresaId,
          },
        }),
      ]);

      reply.send({
        logs,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      console.error("Erro ao buscar logs:", error);
      reply.status(500).send({ error: "Erro interno do servidor" });
    }
  });

  app.get("/logs/produto/:produtoId", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;
      if (!userId) return reply.status(401).send({ mensagem: "Usuário não autenticado" });

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { empresaId: true }
      });

      if (!usuario) {
        return reply.status(404).send({ mensagem: "Usuário não encontrado" });
      }

      const { produtoId } = request.params as { produtoId: string };

      const produto = await prisma.produto.findUnique({
        where: { id: Number(produtoId) },
        select: { empresaId: true }
      });

      if (!produto) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
      }

      if (produto.empresaId !== usuario.empresaId) {
        return reply.status(403).send({ mensagem: "Acesso negado" });
      }

      const logs = await prisma.logs.findMany({
        where: {
          empresaId: usuario.empresaId, 
          OR: [
            {
              descricao: {
                contains: `"produtoId":${produtoId}`,
              },
            },
            {
              descricao: {
                contains: `"produtoId": ${produtoId}`,
              },
            },
            {
              descricao: {
                contains: `Produto Vendido:`,
              },
            }
          ],
        },
        include: {
          usuario: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      reply.send(logs);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      console.error("Erro ao buscar logs do produto:", error);
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
