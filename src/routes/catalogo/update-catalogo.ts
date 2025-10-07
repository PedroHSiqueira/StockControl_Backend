import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function toggleCatalogo(app: FastifyInstance) {
  app.put("/empresa/:id/catalogo", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;

      if (!userId) throw new UnauthorizedError("Usuário não autenticado");

      const temPermissao = await usuarioTemPermissao(userId, "empresa_gerenciar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: empresa_gerenciar" });
      }
      const { id } = request.params as { id: string };
      const { catalogoPublico } = request.body as { catalogoPublico: boolean };

      const empresa = await prisma.empresa.update({
        where: { id },
        data: { catalogoPublico },
      });

      return reply.send(empresa);
    } catch (error) {
      if (error instanceof UnauthorizedError) return reply.status(401).send({ error: error.message });
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });
}
