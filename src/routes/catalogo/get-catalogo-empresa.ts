import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import { calcularSaldoProduto } from "../../lib/estoqueUtils";

export async function catalogoEmpresa(app: FastifyInstance) {
  app.get("/catalogo/:slug", async (request: FastifyRequest, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      const empresa = await prisma.empresa.findUnique({
        where: { slug },
        select: {
          id: true,
          nome: true,
          foto: true,
          telefone: true,
          email: true,
          catalogoPublico: true,
        },
      });

      if (!empresa) {
        return reply.status(404).send({
          mensagem: "Empresa não encontrada",
        });
      }

      if (!empresa.catalogoPublico) {
        return reply.status(404).send({
          mensagem: "Catálogo não está ativado para esta empresa",
        });
      }

      const produtos = await prisma.produto.findMany({
        where: {
          empresaId: empresa.id,
          noCatalogo: true,
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          preco: true,
          foto: true,
          noCatalogo: true,
        },
      });

      const produtosComDados = await Promise.all(
        produtos.map(async (produto) => {
          const saldo = await calcularSaldoProduto(produto.id);
          
          const vendas = await prisma.venda.findMany({
            where: { produtoId: produto.id },
            select: { quantidade: true },
          });

          const totalVendido = vendas.reduce((total, venda) => total + venda.quantidade, 0);

          return {
            ...produto,
            quantidade: saldo, 
            vendas: totalVendido,
          };
        })
      );

      const produtosComEstoque = produtosComDados.filter(produto => produto.quantidade > 0);

      return reply.send({
        empresa: {
          nome: empresa.nome,
          foto: empresa.foto,
          telefone: empresa.telefone,
          email: empresa.email,
        },
        produtos: produtosComEstoque,
      });
    } catch (error) {
      console.error("Erro ao buscar catálogo:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });

  app.get("/empresa/slug/:slug", async (request: FastifyRequest, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      const empresa = await prisma.empresa.findUnique({
        where: { slug },
        select: {
          id: true,
          nome: true,
          catalogoPublico: true,
        },
      });

      return reply.send({
        exists: !!empresa,
        empresa,
        catalogoAtivo: empresa?.catalogoPublico || false,
      });
    } catch (error) {
      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });
}