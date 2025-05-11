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
        
        if (Array.isArray(field)) {
          const firstField = field[0];
          if ('value' in firstField) {
            return firstField.value as string;
          }
          return undefined;
        }
        
        if ('value' in field) {
          return field.value as string;
        }
        
        return undefined;
      };


      const nome = getFieldValue('nome');
      const descricao = getFieldValue('descricao');
      const precoStr = getFieldValue('preco');
      const quantidadeStr = getFieldValue('quantidade');
      const quantidadeMinStr = getFieldValue('quantidadeMin'); 
      const categoriaId = getFieldValue('categoriaId');
      const fornecedorId = getFieldValue('fornecedorId');
      const empresaId = getFieldValue('empresaId');

      if (!nome || !descricao || !precoStr || !quantidadeStr) {
        return reply.status(400).send({ mensagem: "Campos obrigatórios faltando" });
      }

      const preco = parseFloat(precoStr);
      const quantidade = parseInt(quantidadeStr);
      const quantidadeMin = quantidadeMinStr ? parseInt(quantidadeMinStr) : null;

      if (isNaN(preco) || isNaN(quantidade) || (quantidadeMinStr && (quantidadeMin === null || isNaN(quantidadeMin)))) {
        return reply.status(400).send({ mensagem: "Preço, quantidade ou quantidade mínima inválidos" });
      }

      let fotoUrl = '';

      if (data.file) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "auto" },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          );

          pump(data.file, uploadStream).catch(reject);
        });

        fotoUrl = (result as any)?.secure_url || '';
      }

      const produto = await prisma.produto.create({
        data: {
          nome,
          descricao,
          preco,
          quantidade,
          quantidadeMin: quantidadeMin ?? undefined, 
          foto: fotoUrl,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
          empresaId: empresaId || null,
        },
      });

      return reply.status(201).send(produto);
    } catch (error) {
      console.error("Erro ao criar produto:", error);
      return reply.status(500).send({ 
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  });
}