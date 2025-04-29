import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createEmpresa(app: FastifyInstance) {
  app.post("/empresa", async (request, reply) => {
    const criarEmpresaBody = z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      email: z.string().email("Email inválido"),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      pais: z.string().optional(),
      estado: z.string().optional(),
      cidade: z.string().optional(),
      cep: z.string().optional(),
    });

    const { nome, email, telefone, endereco, pais, estado, cidade, cep } = criarEmpresaBody.parse(request.body);

    if (!nome || !email) {
      reply.status(400).send({ mensagem: "Nome e email são obrigatórios" });
      return;
    }

    const empresa = await prisma.empresa.create({
      data: {
        nome,
        email,
        telefone,
        endereco,
        pais,
        estado,
        cidade,
        cep,
      },
    });
    return reply.status(201).send(empresa);
  });
}
