import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createProduto(app: FastifyInstance) {
  app.post("/produtos", async (request, reply) => {
    const criarProdutoBody = z.object({
      nome: z.string(),
      descricao: z.string(),
      preco: z.number(),
      quantidade: z.number(),
      foto: z.string().optional(),
      categoriaId: z.string().optional(),
      fornecedorId: z.string().optional(),
      empresaId: z.string().optional()
    });

    const { nome, descricao, preco, quantidade, foto, categoriaId, fornecedorId, empresaId } = criarProdutoBody.parse(request.body);

    if (!nome || !descricao || !preco || !quantidade) {
      reply.status(400).send({ mensagem: "Preencha todos os campos" });
      return;
    }


    const produto = await prisma.produto.create({
      data: {
        nome: nome,
        descricao: descricao,
        preco: preco,
        quantidade: quantidade,
        foto: foto,
        categoriaId: categoriaId,
        fornecedorId: fornecedorId,
        empresaId: empresaId
      },
    });
    return reply.status(201).send(produto);
  });
}
