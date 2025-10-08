import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

async function devAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return reply.status(401).send({ mensagem: "Credenciais ausentes" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const [email, senha] = Buffer.from(base64Credentials, "base64").toString("utf-8").split(":");

  if (email !== process.env.DEV_EMAIL || senha !== process.env.DEV_SENHA) {
    return reply.status(403).send({ mensagem: "Acesso negado" });
  }
}

export async function deleteCategorias(app: FastifyInstance) {
  app.delete("/categorias/:id", { preHandler: devAuth }, async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { id } = request.params as { id: string };

      await prisma.categoria.delete({
        where: {
          id: String(id),
        },
      });

      reply.status(204);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
