import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline);

export async function createProduto(app: FastifyInstance) {
  app.post("/produtos", async (request: FastifyRequest, reply) => {
    try {
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
          quantidade,
          quantidadeMin: quantidadeMin ?? undefined,
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
        data: logData
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
}