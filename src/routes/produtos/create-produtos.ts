import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline);

export async function createProduto(app: FastifyInstance) {
  app.post("/produtos", async (request: FastifyRequest, reply) => {
    try {
      if (!request.body) {
        return reply.status(400).send({ mensagem: "Corpo da requisição inválido" });
      }

      const body = request.body as any;

      const getValue = (field: any): string | undefined => {
        if (!field) return undefined;
        if (Array.isArray(field)) return field[0].value;
        return field.value;
      };

      const nome = getValue(body.nome);
      const descricao = getValue(body.descricao);
      const precoStr = getValue(body.preco);
      const quantidadeStr = getValue(body.quantidade);
      const quantidadeMinStr = getValue(body.quantidadeMin);
      const categoriaId = getValue(body.categoriaId);
      const fornecedorId = getValue(body.fornecedorId);
      const empresaId = getValue(body.empresaId);
      const file = body.foto?.[0];

      if (!nome || !descricao || !precoStr || !quantidadeStr || !empresaId) {
        return reply.status(400).send({ mensagem: "Campos obrigatórios faltando" });
      }

      const preco = parseFloat(precoStr);
      const quantidade = parseInt(quantidadeStr);
      const quantidadeMin = quantidadeMinStr ? parseInt(quantidadeMinStr) : null;

      if (isNaN(preco) || isNaN(quantidade) || (quantidadeMinStr && isNaN(parseInt(quantidadeMinStr)))) {
        return reply.status(400).send({ mensagem: "Valores numéricos inválidos" });
      }

      let fotoUrl = "";

      if (file?.data) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ resource_type: "auto" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });

          pump(file.data, uploadStream).catch(reject);
        });

        fotoUrl = (result as any)?.secure_url || "";
      }

      const produto = await prisma.produto.create({
        data: {
          nome,
          descricao,
          preco,
          quantidade,
          quantidadeMin: quantidadeMin ?? undefined,
          foto: fotoUrl || undefined,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
          empresaId,
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
}
