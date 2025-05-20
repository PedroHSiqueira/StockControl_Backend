import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getEmpresa(app: FastifyInstance) {
  app.get("/empresa", async (request, reply) => {
    const empresas = await prisma.empresa.findMany({
      include: {
        Produto: true,
        ChaveAtivacao: true,
      }
    });
    reply.send(empresas);
  });

  app.get("/empresa/usuario/:idUsuario", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idUsuario } = request.params as { idUsuario: string };

    const empresa = await prisma.usuario.findUnique({
      where: {
        id: String(idUsuario),
      },
      include: {
        empresa: true,
      },
    });

    if (!empresa) {
      return reply.status(404).send({ mensagem: "Usuário não encontrado" });
    }

    reply.send(empresa.empresa);
  });

  app.get("/empresa/empresa/:idEmpresa", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const empresa = await prisma.empresa.findUnique({
      where: {
        id: idEmpresa,
      },
      include: {
        Produto: true,
        ChaveAtivacao: true,
        usuario: true,
      },
    });

    if (!empresa) {
      return reply.status(404).send({ mensagem: "Empresa não encontrada" });
    }

    reply.send(empresa);
  });

}
