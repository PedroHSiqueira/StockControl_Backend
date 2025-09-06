import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { calcularSaldoProduto } from "../../lib/estoqueUtils";

const pump = promisify(pipeline);

export async function createProduto(app: FastifyInstance) {
  
  app.post("/produtos/verificar-estoque-empresa", async (request, reply) => {
    try {
      const empresasComNotificacaoRecentemente = await prisma.notificacao.findMany({
        where: {
          titulo: "Alerta de Estoque",
          createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
          empresaId: { not: null },
        },
        select: {
          empresaId: true,
        },
        distinct: ["empresaId"],
      });

      const empresasIdsComNotificacao = empresasComNotificacaoRecentemente.map((n) => n.empresaId);

      const produtos = await prisma.produto.findMany({
        include: {
          empresa: true
        },
      });

      const produtosComSaldo = await Promise.all(
        produtos.map(async (produto) => {
          const saldo = await calcularSaldoProduto(produto.id);

          return {
            ...produto,
            quantidade: saldo 
          };
        })
      );

      const produtosPorEmpresa: Record<string, any[]> = {};
      produtosComSaldo.forEach((produto) => {
        if (!produto.empresaId) return;
        if (!produtosPorEmpresa[produto.empresaId]) {
          produtosPorEmpresa[produto.empresaId] = [];
        }
        produtosPorEmpresa[produto.empresaId].push(produto);
      });

      for (const [empresaId, produtosEmpresa] of Object.entries(produtosPorEmpresa)) {
        if (empresasIdsComNotificacao.includes(empresaId)) continue;

        const produtosAlerta = produtosEmpresa.filter((produto) => {
          return produto.quantidadeMin > 0 && produto.quantidade < produto.quantidadeMin + 5;
        });

        if (produtosAlerta.length > 0) {
          const empresa = await prisma.empresa.findUnique({
            where: { id: empresaId },
            include: { usuario: true },
          });

          if (!empresa) continue;

          const titulo = "Alerta de Estoque";

          const lotes = [];
          for (let i = 0; i < produtosAlerta.length; i += 2) {
            lotes.push(produtosAlerta.slice(i, i + 2));
          }

          for (const lote of lotes) {
            let descricao = "Os seguintes produtos estão com estoque baixo:\n";

            lote.forEach((produto) => {
              const estado = produto.quantidade < produto.quantidadeMin ? "CRÍTICO" : "ATENÇÃO";
              descricao += `\n- ${produto.nome}: ${estado} (${produto.quantidade}/${produto.quantidadeMin})`;
            });

            if (lotes.length > 1) {
              descricao += `\n\n(Parte ${lotes.indexOf(lote) + 1} de ${lotes.length})`;
            }

            await prisma.notificacao.create({
              data: {
                titulo,
                descricao: `Enviado por Sistema de Estoque: ${descricao}`,
                lida: false,
                empresa: { connect: { id: empresaId } },
              },
            });
          }
        }
      }

      reply.send({ mensagem: "Verificação de estoque concluída" });
    } catch (error) {
      console.error("Erro na verificação de estoque:", error);
      reply.status(500).send({ mensagem: "Erro interno no servidor" });
    }
  });

  app.post("/produtos", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }
      const temPermissao = await usuarioTemPermissao(userId, "produtos_criar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_criar" });
      }
      const parts = request.parts();

      const fields: Record<string, any> = {};
      let fotoFile: any = null;

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "foto") {
          fotoFile = part;
        } else if (part.type === "field") {
          fields[part.fieldname] = part.value;
        }
      }

      const nome = fields["nome"] || "";
      const descricao = fields["descricao"] || "";
      const precoStr = fields["preco"] || "0";
      const quantidadeStr = fields["quantidade"] || "0";
      const quantidadeMinStr = fields["quantidadeMin"];
      const noCatalogoStr = fields["noCatalogo"] || "false";
      const categoriaId = fields["categoriaId"];
      const fornecedorId = fields["fornecedorId"];
      const empresaId = fields["empresaId"];
      const usuarioId = fields["usuarioId"];

      if (!nome.trim() || !descricao.trim() || !empresaId) {
        return reply.status(400).send({
          mensagem: "Campos obrigatórios faltando",
          camposRecebidos: {
            nome: !!nome,
            descricao: !!descricao,
            empresaId: !!empresaId,
          },
        });
      }

      const preco = parseFloat(precoStr.replace(",", ".")) || 0;
      const quantidade = parseInt(quantidadeStr) || 0;
      const quantidadeMin = quantidadeMinStr ? parseInt(quantidadeMinStr) : null;
      const noCatalogo = noCatalogoStr === "true";

      if (isNaN(preco)) {
        return reply.status(400).send({ mensagem: "Valor de preço inválido" });
      }

      if (isNaN(quantidade)) {
        return reply.status(400).send({ mensagem: "Valor de quantidade inválido" });
      }

      if (quantidadeMinStr && isNaN(quantidadeMin as number)) {
        return reply.status(400).send({ mensagem: "Valor de quantidade mínima inválido" });
      }

      let fotoUrl = null;

      if (fotoFile) {
        try {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
              if (error) {
                console.error("Erro no upload:", error);
                resolve(null);
              } else {
                resolve(result);
              }
            });
            pump(fotoFile.file, uploadStream).catch((err) => {
              console.error("Erro no pipeline:", err);
              resolve(null);
            });
          });

          fotoUrl = (result as any)?.secure_url || null;
        } catch (uploadError) {
          console.error("Erro no upload da imagem:", uploadError);
        }
      }

      const produto = await prisma.produto.create({
        data: {
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco,
          quantidadeMin: quantidadeMin ?? undefined,
          noCatalogo,
          foto: fotoUrl,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
          empresaId,
          usuarioId,
        },
      });

      const logData = {
        empresaId: produto.empresaId,
        descricao: `Produto criado: ${produto.nome}`,
        tipo: "CRIACAO" as const,
        usuarioId: produto.usuarioId,
      };

      await prisma.logs.create({
        data: logData,
      });

      return reply.status(201).send(produto);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });

  app.put("/produtos/:id/catalogo", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }
      const temPermissao = await usuarioTemPermissao(userId, "produtos_editar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_editar" });
      }

      const { id } = request.params as { id: string };
      const { noCatalogo } = request.body as { noCatalogo: boolean };

      const produto = await prisma.produto.update({
        where: { id: Number(id) },
        data: { noCatalogo },
      });

      return reply.send(produto);
    } catch (error) {
      console.error("Erro ao atualizar catálogo do produto:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });
}
