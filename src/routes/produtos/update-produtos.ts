import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline);

export async function updateProduto(app: FastifyInstance) {
  app.put("/produtos/:id", async (request: FastifyRequest, reply) => {
    try {
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
      const categoriaId = fields["categoriaId"];
      const fornecedorId = fields["fornecedorId"];

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
          foto: fotoUrl,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
        },
      });

      return reply.status(200).send(produtoAtualizado);
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });
}
