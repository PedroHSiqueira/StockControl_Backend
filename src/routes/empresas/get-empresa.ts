import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getEmpresa(app: FastifyInstance) {
  app.get("/empresa", async (request, reply) => {
    const empresas = await prisma.empresa.findMany();
    reply.send(empresas);
  });

  app.get("/empresa/:idUsuario", async (request: FastifyRequest, reply: FastifyReply) => {
    const { idUsuario } = request.params as { idUsuario: string };

    const usuario = await prisma.usuario.findUnique({
      where: { id: idUsuario },
      include: {
        empresa: true,  
      },
    });

    if (!usuario || !usuario.empresa) {
      return reply.status(404).send({ mensagem: "Empresa não encontrada" });
    }

    return reply.send({
      empresa: usuario.empresa,   
      tipoUsuario: usuario.tipo,  
    });
  });
}
