import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateUser(app: FastifyInstance) {
  app.put("/usuario/:id", async (request, reply) => {
    const updateBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      empresa: z
        .object({
          nome: z.string().optional(),
          telefone: z.string().optional(),
          endereco: z.string().optional(),
          pais: z.string().optional(),
          estado: z.string().optional(),
          cidade: z.string().optional(),
          cep: z.string().optional(),
        })
        .optional(),
    });

    const { id } = request.params as { id: string };
    const { nome, email, empresa } = updateBody.parse(request.body);

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: { nome, email },
    });

    if (empresa) {
      await prisma.empresa.updateMany({
        where: { id: usuarioAtualizado.empresaId || undefined },
        data: {
          nome: empresa.nome,
          telefone: empresa.telefone,
          endereco: empresa.endereco,
          pais: empresa.pais,
          estado: empresa.estado,
          cidade: empresa.cidade,
          cep: empresa.cep,
        },
      });
    }

    reply.send({ mensagem: "Conta atualizada com sucesso!" });
  });
}
