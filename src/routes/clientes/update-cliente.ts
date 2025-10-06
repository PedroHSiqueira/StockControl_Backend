import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function updateCliente(app: FastifyInstance) {
  app.put("/clientes/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "clientes_editar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: clientes_editar" });
      }
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
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
