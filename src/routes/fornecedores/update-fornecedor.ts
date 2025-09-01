import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from '../../config/cloudinaryConfig';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { usuarioTemPermissao } from "../../lib/permissaoUtils";

const pump = promisify(pipeline);

export async function updateFornecedor(app: FastifyInstance) {
  app.put("/fornecedor/:id", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers['user-id'] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "fornecedores_editar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: fornecedores_editar" });
      }
      const { id } = request.params as { id: string };

      const parts = request.parts();
      const fields: Record<string, any> = {};
      let fotoFile: any = null;

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'foto') {
          fotoFile = part;
        } else if (part.type === 'field') {
          fields[part.fieldname] = part.value;
        }
      }

      const nome = fields['nome'] || '';
      const email = fields['email'] || '';
      const cnpj = fields['cnpj'] || '';
      const telefone = fields['telefone'] || '';
      const categoria = fields['categoria'] || '';
      const empresaId = fields['empresaId'] || '';

      if (!nome.trim() || !email.trim() || !cnpj.trim() || !telefone.trim() || !empresaId.trim()) {
        return reply.status(400).send({
          mensagem: "Por favor, preencher todos os campos obrigatórios",
          camposRecebidos: {
            nome: !!nome,
            email: !!email,
            cnpj: !!cnpj,
            telefone: !!telefone,
            empresaId: !!empresaId
          }
        });
      }

      const fornecedorExistente = await prisma.fornecedor.findUnique({
        where: { id: String(id) }
      });

      let fotoUrl = fornecedorExistente?.foto || null;

      if (fotoFile) {
        try {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: "auto" },
              (error, result) => {
                if (error) {
                  console.error("Erro no upload:", error);
                  resolve(null);
                } else {
                  resolve(result);
                }
              }
            );
            pump(fotoFile.file, uploadStream).catch(err => {
              console.error("Erro no pipeline:", err);
              resolve(null);
            });
          });

          fotoUrl = (result as any)?.secure_url || null;
        } catch (uploadError) {
          console.error("Erro no upload da imagem:", uploadError);
        }
      }

      const fornecedor = await prisma.fornecedor.update({
        where: {
          id: String(id),
        },
        data: {
          nome: nome.trim(),
          email: email.trim(),
          cnpj: cnpj.trim(),
          telefone: telefone.trim(),
          categoria: categoria.trim(),
          foto: fotoUrl,
          empresaId: empresaId.trim(),
        },
      });


      await prisma.logs.create({
        data: {
          descricao: `Fornecedor Atualizado: ${fornecedor.nome}`,
          tipo: "ATUALIZACAO",
        },
      });

      return reply.send(fornecedor);
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      });
    }
  });
}
