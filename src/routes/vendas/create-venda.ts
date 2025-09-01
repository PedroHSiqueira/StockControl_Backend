import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function createVenda(app: FastifyInstance) {
  app.post("/venda", async (request, reply) => {
    const userId = request.headers['user-id'] as string;

    if (!userId) {
      return reply.status(401).send({ mensagem: "Usuário não autenticado" });
    }

    const temPermissao = await usuarioTemPermissao(userId, "vendas_realizar");
    if (!temPermissao) {
      return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: vendas_realizar" });
    }
    const criarVendaBody = z.object({
      empresaId: z.string(),
      produtoId: z.number(),
      quantidade: z.number().min(1),
      valorVenda: z.number().min(0).optional(),
      valorCompra: z.number().min(0),
      usuarioId: z.string().optional(),
      clienteId: z.string().optional().nullable(),
    });

    const { empresaId, produtoId, quantidade, valorVenda, valorCompra, usuarioId, clienteId } = criarVendaBody.parse(request.body);
    const produto = await prisma.produto.findUnique({
      where: {
        id: produtoId,
      },
    });

    const cliente = clienteId ? await prisma.cliente.findUnique({
      where: {
        id: clienteId,
      },
    }) : null;

    const venda = await prisma.venda.create({
      data: {
        empresaId,
        produtoId,
        quantidade,
        valorVenda: produto?.preco !== undefined ? produto.preco * quantidade : valorVenda ?? 0,
        valorCompra,
        usuarioId,
        clienteId,
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
        descricao: `${produto?.nome} \n| Quantidade: ${quantidade} \n| Cliente: ${cliente ? cliente.nome : "Não Informado"} `,
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