import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createEmpresa(app: FastifyInstance) {
  app.post("/empresa", async (request, reply) => {
    const criarEmpresaBody = z.object({
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

    const userId = request.headers["user-id"] as string | undefined;

    if (!userId) {
      return reply.status(401).send({ mensagem: "Usuário não autenticado" });
    }

    const {
      nome,
      email,
      foto,
      telefone,
      endereco,
      pais,
      estado,
      cidade,
      cep,
    } = criarEmpresaBody.parse(request.body);

    const empresa = await prisma.empresa.create({
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
        usuario: {
          connect: {
            id: userId,
          },
        },
      },
    });

    await prisma.usuario.update({
      where: { id: userId },
      data: {
        empresaId: empresa.id,
        tipo: "PROPRIETARIO",
      },
    });

    return reply.status(201).send(empresa);
  });
}
