import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";

export async function createVenda(app: FastifyInstance) {
  app.post("/venda", async (request, reply) => {
    const criarVendaBody = z.object({
      empresaId: z.string(),
      produtoId: z.number(),
      quantidade: z.number().min(1),
      valorVenda: z.number().min(0).optional(),
      valorCompra: z.number().min(0),
      usuarioId: z.string().optional(),
    });

    const { empresaId, produtoId, quantidade, valorVenda, valorCompra, usuarioId } = criarVendaBody.parse(request.body);
    const produto = await prisma.produto.findUnique({
      where: {
        id: produtoId,
      },
    });

    const venda = await prisma.venda.create({
      data: {
        empresaId,
        produtoId,
        quantidade,
        valorVenda: produto?.preco !== undefined ? produto.preco * quantidade : valorVenda ?? 0,
        valorCompra,
        usuarioId,
        
      },
    });

    await prisma.produto.update({
      where: {
        id: produtoId,
      },
      data: {
        quantidade: produto?.quantidade ? produto.quantidade - quantidade : 0,
      },
    });

     await prisma.logs.create({
          data: {
            descricao: `Produto Vendido: ${produto?.nome} | Quantidade: ${quantidade}`,
            tipo: "BAIXA" as const,
            empresaId: produto?.empresaId,
            usuarioId: produto?.usuarioId,
          }
        });

    return reply.status(201).send({
      mensagem: "Venda criada com sucesso",
      venda,
    });
  });
}
