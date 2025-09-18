import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { calcularSaldoProduto } from "../../lib/estoqueUtils";


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

      const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);

      const produtos = await prisma.produto.findMany({
        where: {
          createdAt: {
            lte: umaHoraAtras
          }
        },
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


app.post("/produtos/upload-foto", async (request: FastifyRequest, reply) => {
  try {

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ mensagem: "Nenhum arquivo enviado" });
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    for await (const chunk of data.file) {
      chunks.push(chunk);
      totalSize += chunk.length;
    }

    const fileBuffer = Buffer.concat(chunks);


    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          chunk_size: 20 * 1024 * 1024,
          timeout: 60000,
        },
        (error, result) => {
          if (error) {
            console.error("ERRO CLOUDINARY:", error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });

    return reply.send({
      success: true,
      message: "Upload da foto realizado com sucesso",
      fotoUrl: (result as any)?.secure_url,
      fileSize: fileBuffer.length
    });

  } catch (error) {
    console.error("Erro no upload separado:", error);
    return reply.status(500).send({
      error: "Erro no upload da foto",
      details: error instanceof Error ? error.message : String(error)
    });
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

    const body = request.body as any;
    const {
      nome,
      descricao,
      preco,
      quantidade,
      quantidadeMin,
      noCatalogo,
      categoriaId,
      fornecedorId,
      empresaId,
      usuarioId,
      fotoUrl 
    } = body;

    if (!nome || !descricao || !empresaId) {
      return reply.status(400).send({
        mensagem: "Campos obrigatórios faltando: nome, descricao, empresaId"
      });
    }

    const precoNum = typeof preco === 'string' ? parseFloat(preco.replace(",", ".")) : preco;
    const quantidadeNum = typeof quantidade === 'string' ? parseInt(quantidade) : quantidade;
    const quantidadeMinNum = quantidadeMin ? (typeof quantidadeMin === 'string' ? parseInt(quantidadeMin) : quantidadeMin) : null;
    const noCatalogoBool = noCatalogo === 'true' || noCatalogo === true;

    if (isNaN(precoNum)) return reply.status(400).send({ mensagem: "Preço inválido" });
    if (isNaN(quantidadeNum)) return reply.status(400).send({ mensagem: "Quantidade inválida" });

    const produto = await prisma.produto.create({
      data: {
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco: precoNum,
        quantidadeMin: quantidadeMinNum ?? undefined,
        noCatalogo: noCatalogoBool,
        foto: fotoUrl || null,
        categoriaId: categoriaId || null,
        fornecedorId: fornecedorId || null,
        empresaId,
        usuarioId: usuarioId || userId,
      },
    });

    await prisma.logs.create({
      data: {
        empresaId: produto.empresaId,
        descricao: `Produto criado: ${produto.nome}`,
        tipo: "CRIACAO",
        usuarioId: produto.usuarioId,
      },
    });

    return reply.status(201).send(produto);

  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return reply.status(500).send({
      mensagem: "Erro interno no servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido",
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
