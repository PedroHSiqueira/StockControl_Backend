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
    });

    return reply.status(200).send({total});
  });
}
