import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function toggleCatalogo(app: FastifyInstance) {
  app.put("/empresa/:id/catalogo", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

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
      console.error("Erro ao atualizar catálogo:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });
}
