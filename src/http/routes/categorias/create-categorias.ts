import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createCategorias(app: FastifyInstance) {
  app.post("/categorias", async (request, reply) => {
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
  });
}
