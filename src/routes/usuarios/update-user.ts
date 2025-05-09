import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function updateUser(app: FastifyInstance) {
  app.put("/usuario/:id", async (request, reply) => {
    const updateBody = z.object({
      nome: z.string().optional(),
      email: z.string().email().optional(),
      tipo: z.enum(["FUNCIONARIO", "ADMIN", "PROPRIETARIO"]).optional(),
      empresaId: z.string().uuid().nullable().optional(), 
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
    const { nome, email, tipo, empresa, empresaId } = updateBody.parse(request.body);

    let updateData: any = { nome, email, tipo };
    if (empresaId === null) {
      updateData = {
        ...updateData,
        empresaId: null,
        tipo: "FUNCIONARIO", 
      };
    } else {
      updateData = { ...updateData, empresaId };
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: updateData,
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
  app.put("/usuario/convite/:id", async (request, reply) => {
    const updateBody = z.object({
      empresaId: z.string().uuid(),
    });

    const { id } = request.params as { id: string };
    const { empresaId } = updateBody.parse(request.body);

    const empresaAtualizada = await prisma.usuario.update({
      where: { id },
      data: { empresaId },
    });

    const deletaNotificacao = await prisma.notificacao.deleteMany({
      where: {
        usuarioId: id,
      },
    });

    reply.send({ mensagem: "Usuario Vinculado a empresa com sucesso" });
  })
}
