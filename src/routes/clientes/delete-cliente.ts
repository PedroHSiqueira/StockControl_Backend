import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function deleteCliente(app: FastifyInstance) {
  app.delete("/clientes/:id", async (request, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;

      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "clientes_excluir");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: clientes_excluir" });
      }
      const { id } = request.params as { id: string };

      const clienteExistente = await prisma.cliente.findUnique({
        where: { id },
      });

      if (!clienteExistente) {
        return reply.status(404).send({ mensagem: "Cliente não encontrado." });
      }

      await prisma.cliente.delete({
        where: { id },
      });

      reply.status(200).send({ mensagem: "Cliente deletado com sucesso!" });
    } catch (error) {
      if(error instanceof UnauthorizedError){
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });
}
