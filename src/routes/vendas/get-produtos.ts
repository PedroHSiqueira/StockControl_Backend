import { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma";

export async function getVendas(app: FastifyInstance) {
  app.get("/venda/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const vendas = await prisma.venda.findMany({
      where: {
        empresaId: idEmpresa,
      },
      include: {
        produto: true,
        cliente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reply.status(200).send({
      mensagem: "Vendas encontradas com sucesso",
      vendas,
    });
  });

  app.get("/venda/contagem/:idEmpresa", async (request, reply) => {
    const { idEmpresa } = request.params as { idEmpresa: string };

    const total = await prisma.venda.aggregate({
      where: {
        empresaId: idEmpresa,
      },
      _sum: {
        valorVenda: true,
      },
      _count: {
        id: true,
      },
    });

    return reply.status(200).send({
      total: total._sum.valorVenda,
      quantidadeVendas: total._count.id,
    });
  });
}