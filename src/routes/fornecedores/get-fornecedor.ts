import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getFornecedor(app: FastifyInstance) {
  app.get("/fornecedor", async (request, reply) => {
    const fornecedor = await prisma.fornecedor.findMany();
    reply.send(fornecedor);
  });


app.get("/fornecedor/empresa/:empresaId", async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { empresaId } = request.params as { empresaId: string };
    
    const fornecedores = await prisma.fornecedor.findMany({
      where: {
        empresaId: empresaId
      },
      orderBy: {
        nome: 'asc'
      }
    });

    reply.send(fornecedores);
  } catch (error) {
    console.error("Erro ao buscar fornecedores da empresa:", error);
    reply.status(500).send({ mensagem: "Erro interno ao buscar fornecedores" });
  }
});

  app.get("/fornecedor/contagem/:empresaId", async (request, reply) => {
    const { empresaId } = request.params as { empresaId: string };
    const contagem = await prisma.fornecedor.aggregate({
      where: {
        empresaId: empresaId,
      },
      _count: {
        id: true,
      },
    });

    reply.send(contagem);
  });
}
