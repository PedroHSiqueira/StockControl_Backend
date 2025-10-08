import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";

async function devAuth(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return reply.status(401).send({ mensagem: "Credenciais ausentes" });
  }

  const base64Credentials = authHeader.split(" ")[1];
  const [email, senha] = Buffer.from(base64Credentials, "base64")
    .toString("utf-8")
    .split(":");

  if (email !== process.env.DEV_EMAIL || senha !== process.env.DEV_SENHA) {
    return reply.status(403).send({ mensagem: "Acesso negado" });
  }
}

export async function createKey(app: FastifyInstance) {
  app.post("/chaves", { preHandler: devAuth }, async (request, reply) => {
    try {
      const chave = crypto.randomUUID();

      const novaChave = await prisma.chaveAtivacao.create({
        data: {
          chave,
          utilizada: false,
        },
      });

      return reply.status(201).send({
        mensagem: "Chave criada com sucesso",
        chave: novaChave.chave,
      });
    } catch (error) {
      console.error("Erro ao criar chave:", error);
      return reply
        .status(500)
        .send({ mensagem: "Erro interno ao criar chave" });
    }
  });
}
