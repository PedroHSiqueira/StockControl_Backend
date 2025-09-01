import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

const pump = promisify(pipeline);

export async function updateProduto(app: FastifyInstance) {
  app.put("/produtos/:id", async (request: FastifyRequest, reply) => {
    try {
      if (request.url.endsWith("/catalogo")) {
        const userId = request.headers['user-id'] as string;

        if (!userId) {
          return reply.status(401).send({ mensagem: "Usuário não autenticado" });
        }

        const temPermissao = await usuarioTemPermissao(userId, "produtos_editar");
        if (!temPermissao) {
          return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_editar" });
        }

        const { id } = request.params as { id: string };
        const { noCatalogo } = request.body as { noCatalogo: boolean };

        const produtoExistente = await prisma.produto.findUnique({
          where: { id: Number(id) },
        });

        if (!produtoExistente) {
          return reply.status(404).send({ mensagem: "Produto não encontrado" });
        }

        const produtoAtualizado = await prisma.produto.update({
          where: { id: Number(id) },
          data: { noCatalogo },
        });

        return reply.status(200).send(produtoAtualizado);
      }

      const userId = request.headers['user-id'] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "produtos_editar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_editar" });
      }
      const { id } = request.params as { id: string };
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
      const usuarioId = fields["usuarioId"];

      if (!nome.trim() || !descricao.trim()) {
        return reply.status(400).send({
          mensagem: "Campos obrigatórios faltando",
          camposRecebidos: {
            nome: !!nome,
            descricao: !!descricao,
          },
        });
      }

      const preco = parseFloat(precoStr.replace(",", ".")) || 0;
      const quantidade = parseInt(quantidadeStr) || 0;
      const quantidadeMin = quantidadeMinStr ? parseInt(quantidadeMinStr) : null;
      const noCatalogo = noCatalogoStr === "true";

      if (isNaN(preco) || isNaN(quantidade) || (quantidadeMinStr && isNaN(quantidadeMin as number))) {
        return reply.status(400).send({ mensagem: "Preço, quantidade ou quantidade mínima inválidos" });
      }

      const produtoExistente = await prisma.produto.findUnique({
        where: { id: Number(id) },
      });

      if (!produtoExistente) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
      }

      let fotoUrl = produtoExistente.foto || null;

      if (fotoFile && fotoFile.file && fotoFile.file.readable) {
        if (produtoExistente.foto) {
          const publicId = produtoExistente.foto.split("/").pop()?.split(".")[0];
          if (publicId) {
            await cloudinary.uploader.destroy(publicId).catch(console.error);
          }
        }

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
      }

      const produtoAtualizado = await prisma.produto.update({
        where: { id: Number(id) },
        data: {
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco,
          quantidade,
          quantidadeMin: quantidadeMin ?? undefined,
          noCatalogo,
          foto: fotoUrl,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
          usuarioId: usuarioId || null,
        },
      });

      const logData = {
        empresaId: produtoAtualizado.empresaId,
        descricao: `Produto Atualizado: ${produtoAtualizado.nome}`,
        tipo: "ATUALIZACAO" as const,
        usuarioId: produtoAtualizado.usuarioId,
      };

      await prisma.logs.create({
        data: logData
      });

      return reply.status(200).send(produtoAtualizado);
    } catch (error) {
      console.error("Erro ao atualizar o produto:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}