import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function getFornecedor(app: FastifyInstance) {
  app.get("/fornecedor", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const fornecedor = await prisma.fornecedor.findMany(
        {
          include: {
            Produto: true,
          },
        }
      );
      reply.send(fornecedor);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.get("/fornecedor/empresa/:empresaId", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const { empresaId } = request.params as { empresaId: string };

      const fornecedores = await prisma.fornecedor.findMany({
        where: {
          empresaId: empresaId,
        },
        include: {
          Produto: true,
        },
        orderBy: {
          nome: "asc",
        },
      });

      reply.send(fornecedores);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno ao buscar fornecedores" });
    }
  });

  app.get("/fornecedor/contagem/:empresaId", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { empresaId } = request.params as { empresaId: string };
      const contagem = await prisma.fornecedor.aggregate({
        where: {
          empresaId: empresaId,
        },
        _count: {
          id: true,
        },
      });

      reply.send(contagem);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }
    }
  });
}
