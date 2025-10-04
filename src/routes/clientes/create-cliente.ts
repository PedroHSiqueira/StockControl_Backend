import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function createCliente(app: FastifyInstance) {
  app.post("/clientes", async (request, reply) => {
    const userId = request.headers["user-id"] as string;

    if (!userId) {
      return reply.status(401).send({ mensagem: "Usuário não autenticado" });
    }

    const temPermissao = await usuarioTemPermissao(userId, "clientes_criar");
    if (!temPermissao) {
      return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: clientes_criar" });
    }
    const createBody = z.object({
      nome: z.string(),
      email: z.string().email(),
      empresaId: z.string(),
      telefone: z.string().optional(),
      endereco: z.string().optional(),
      pais: z.string().optional(),
      estado: z.string().optional(),
      cidade: z.string().optional(),
      cep: z.string().optional(),
    });

    const { nome, email, telefone, endereco, estado, cidade, cep, empresaId } = createBody.parse(request.body);

    const clienteCriado = await prisma.cliente.create({
      data: {
        nome,
        email,
        telefone,
        endereco,
        estado,
        cidade,
        cep,
        empresaId,
      },
    });

    reply.status(201).send({ mensagem: "Cliente criado com sucesso!", cliente: clienteCriado });
  });
}
