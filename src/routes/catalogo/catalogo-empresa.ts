import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";

export async function catalogoEmpresa(app: FastifyInstance) {
  app.get("/catalogo/:slug", async (request: FastifyRequest, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      console.log('Buscando empresa com slug:', slug);

      const empresa = await prisma.empresa.findUnique({
        where: { slug },
        select: {
          id: true,
          nome: true,
          foto: true,
          telefone: true,
          email: true,
          catalogoPublico: true
        }
      });

      console.log('Empresa encontrada:', empresa);

      if (!empresa) {
        return reply.status(404).send({ 
          mensagem: "Empresa não encontrada" 
        });
      }

      if (!empresa.catalogoPublico) {
        return reply.status(404).send({ 
          mensagem: "Catálogo não está ativado para esta empresa" 
        });
      }

      const produtos = await prisma.produto.findMany({
        where: { 
          empresaId: empresa.id,
          noCatalogo: true,
          quantidade: { gt: 0 }
        },
        select: {
          id: true,
          nome: true,
          descricao: true,
          preco: true,
          foto: true,
          quantidade: true,
          noCatalogo:true
        }
      });

      console.log('Produtos encontrados:', produtos.length);

      const produtosComVendas = await Promise.all(
        produtos.map(async (produto) => {
          const vendasCount = await prisma.venda.count({
            where: { produtoId: produto.id }
          });
          
          return {
            ...produto,
            vendas: vendasCount
          };
        })
      );

      return reply.send({
        empresa: {
          nome: empresa.nome,
          foto: empresa.foto,
          telefone: empresa.telefone,
          email: empresa.email
        },
        produtos: produtosComVendas
      });
    } catch (error) {
      console.error("Erro ao buscar catálogo:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor"
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
          catalogoPublico: true
        }
      });

      return reply.send({ 
        exists: !!empresa, 
        empresa,
        catalogoAtivo: empresa?.catalogoPublico || false
      });
    } catch (error) {
      return reply.status(500).send({ mensagem: "Erro interno" });
    }
  });
}