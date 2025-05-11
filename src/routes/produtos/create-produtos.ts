import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from '../../config/cloudinaryConfig';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pump = promisify(pipeline);

export async function createProduto(app: FastifyInstance) {
  app.post("/produtos", async (request: FastifyRequest, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ mensagem: "Nenhum dado recebido" });
      }

      const getFieldValue = (fieldName: string): string | undefined => {
        const field = data.fields[fieldName];
        if (!field) return undefined;
        
        if (!Array.isArray(field) && field.type === 'file') return undefined;
        
        if (Array.isArray(field)) {
          return typeof field[0] === 'string' ? field[0] : undefined;
        }
        
        if (typeof field.value === 'string' && field.value.trim() === '') {
          return undefined;
        }
        return field.value?.toString() || undefined;
      };

      console.log("Fields received:", data.fields);

      const nome = getFieldValue('nome') || '';
      const descricao = getFieldValue('descricao') || '';
      const precoStr = getFieldValue('preco') || '0';
      const quantidadeStr = getFieldValue('quantidade') || '0';
      const quantidadeMinStr = getFieldValue('quantidadeMin');
      const categoriaId = getFieldValue('categoriaId');
      const fornecedorId = getFieldValue('fornecedorId');
      const empresaId = getFieldValue('empresaId');

      if (!nome.trim() || !descricao.trim() || !empresaId) {
        return reply.status(400).send({ 
          mensagem: "Campos obrigatórios faltando",
          camposRecebidos: {
            nome: !!nome,
            descricao: !!descricao,
            empresaId: !!empresaId
          }
        });
      }

      const preco = parseFloat(precoStr.replace(',', '.')) || 0;
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
      
      if (data.fields.foto && 'file' in data.fields.foto) {
        try {
          const fileStream = data.fields.foto.file;
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: "auto" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            pump(fileStream, uploadStream).catch(reject);
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
        },
      });

      return reply.status(201).send(produto);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      });
    }
  });
}