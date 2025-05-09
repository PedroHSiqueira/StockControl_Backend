import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createFornecedor(app: FastifyInstance) {
  app.post("/fornecedor", async (request, reply) => {
    const criarFornecedorBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      cnpj: z.string(),
      telefone: z.string(),
    });

    const { nome,email, cnpj,telefone } = criarFornecedorBody.parse(request.body);


    if (!nome || !email || !cnpj || !telefone) {
      reply.status(400).send({ mensagem: "Por favor, Prencheer todo os campos" });
      return;
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        nome: nome,
        email: email,
        cnpj: cnpj,
        telefone: telefone,
      },
    });
    return reply.status(201).send(fornecedor);
  });
}
