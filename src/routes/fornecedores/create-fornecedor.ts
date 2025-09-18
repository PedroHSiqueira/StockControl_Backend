import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";

import { usuarioTemPermissao } from "../../lib/permissaoUtils";

export async function createFornecedor(app: FastifyInstance) {
  app.post("/fornecedor/upload-foto", async (request: FastifyRequest, reply) => {
    try {

      const userId = request.headers["user-id"] as string;
      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "fornecedores_criar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: fornecedores_criar" });
      }

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
              console.log("SUCESSO CLOUDINARY:", {
                bytes: result?.bytes,
                format: result?.format,
                url: result?.secure_url
              });
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

  app.post("/fornecedor", async (request: FastifyRequest, reply) => {
    try {
      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const temPermissao = await usuarioTemPermissao(userId, "fornecedores_criar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: fornecedores_criar" });
      }

      const body = request.body as any;
      const {
        nome,
        email,
        cnpj,
        telefone,
        categoria,
        empresaId,
        fotoUrl 
      } = body;

      if (!nome?.trim() || !email?.trim() || !cnpj?.trim() || !telefone?.trim() || !empresaId?.trim()) {
        return reply.status(400).send({
          mensagem: "Por favor, preencher todos os campos obrigatórios",
          camposRecebidos: {
            nome: !!nome,
            email: !!email,
            cnpj: !!cnpj,
            telefone: !!telefone,
            empresaId: !!empresaId,
          },
        });
      }

      const fornecedor = await prisma.fornecedor.create({
        data: {
          nome: nome.trim(),
          email: email.trim(),
          cnpj: cnpj.trim(),
          telefone: telefone.trim(),
          categoria: categoria?.trim() || "",
          foto: fotoUrl || null,
          empresaId: empresaId.trim(),
        },
      });

      await prisma.logs.create({
        data: {
          descricao: `Fornecedor criado: ${fornecedor.nome}`,
          tipo: "CRIACAO",
          empresaId: fornecedor.empresaId,
          usuarioId: userId,
        },
      });
      return reply.status(201).send(fornecedor);
    } catch (error) {
      console.error("Erro ao criar fornecedor:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });
}