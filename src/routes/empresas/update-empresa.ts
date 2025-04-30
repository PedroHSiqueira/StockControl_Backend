import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateEmpresa(app: FastifyInstance) {
  app.put("/empresa/:id", async (request, reply) => {
    const updateEmpresaBody = z.object({
      nome: z.string().min(1, "Nome é obrigatório"),
      email: z.string().email("Email inválido"),
      foto: z.string().optional(),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      pais: z.string().optional(),
      estado: z.string().optional(),
      cidade: z.string().optional(),
      cep: z.string().optional(),
    });

    const { id } = request.params as { id: string };
    const { nome, email, foto, telefone, endereco, pais, estado, cidade, cep } = updateEmpresaBody.parse(request.body);

    const empresa = await prisma.empresa.update({
      where: {
        id: String(id),
      },
      data: {
        nome,
        email,
        foto,
        telefone,
        endereco,
        pais,
        estado,
        cidade,
        cep,
      },
    });

    reply.send(empresa);
  });
}
