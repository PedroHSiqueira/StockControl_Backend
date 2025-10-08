import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function createCategorias(app: FastifyInstance) {
  app.post("/categorias", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const criarCategoriasBody = z.object({
        nome: z.string(),
        descricao: z.string(),
      });

      const { nome, descricao } = criarCategoriasBody.parse(request.body);

      if (!nome || !descricao) {
        reply.status(400).send({ mensagem: "Preencha todos os campos" });
        return;
      }

      const categorias = await prisma.categoria.create({
        data: {
          nome: nome,
          descricao: descricao,
        },
      });
      return reply.status(201).send(categorias);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
