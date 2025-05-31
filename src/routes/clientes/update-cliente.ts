import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import bcrypt from "bcrypt";

export async function updateCliente(app: FastifyInstance) {
  app.put("/clientes/:id", async (request, reply) => {
    const updateBody = z.object({
      nome: z.string().optional(),
      email: z.string().email().optional(),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      pais: z.string().optional(),
      estado: z.string().optional(),
      cidade: z.string().optional(),
      cep: z.string().optional(),
    });

    const { id } = request.params as { id: string };
    const updateData = updateBody.parse(request.body);

    const clienteExistente = await prisma.cliente.findUnique({
      where: { id },
    });

    if (!clienteExistente) {
      return reply.status(404).send({ mensagem: "Cliente não encontrado." });
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: { id },
      data: updateData,
    });

    reply.status(200).send({ mensagem: "Cliente atualizado com sucesso!", cliente: clienteAtualizado });
  });
}
