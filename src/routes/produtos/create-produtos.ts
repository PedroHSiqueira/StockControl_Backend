import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";
import { PhotoUploadError } from "../../exceptions/PhotoUploadException";

export async function createProduto(app: FastifyInstance) {
  app.post("/produtos/upload-foto", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

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
              reject(new PhotoUploadError("Erro no upload da foto"));
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
        fileSize: fileBuffer.length,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      if (error instanceof PhotoUploadError) {
        return reply.status(502).send({ error: error.message });
      }

      return reply.status(500).send({
        error: "Erro no upload da foto",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/produtos", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;

      if (!userId) {
        throw new UnauthorizedError("Usuário não autenticado");
      }

      const temPermissao = await usuarioTemPermissao(userId, "produtos_criar");
      if (!temPermissao) {
        return reply.status(403).send({ mensagem: "Acesso negado. Permissão necessária: produtos_criar" });
      }

      const body = request.body as any;
      const { nome, descricao, preco, quantidade, quantidadeMin, noCatalogo, categoriaId, fornecedorId, empresaId, usuarioId, fotoUrl } = body;

      if (!nome || !descricao || !empresaId) {
        return reply.status(400).send({
          mensagem: "Campos obrigatórios faltando: nome, descricao, empresaId",
        });
      }

      const precoNum = typeof preco === "string" ? parseFloat(preco.replace(",", ".")) : preco;
      const quantidadeNum = typeof quantidade === "string" ? parseInt(quantidade) : quantidade;
      const quantidadeMinNum = quantidadeMin ? (typeof quantidadeMin === "string" ? parseInt(quantidadeMin) : quantidadeMin) : null;
      const noCatalogoBool = noCatalogo === "true" || noCatalogo === true;

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
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      });
    }
  });

  app.put("/produtos/:id/catalogo", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const userId = request.headers["user-id"] as string;

      if (!userId) {
        throw new UnauthorizedError("Usuário não autenticado");
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
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
      });
    }
  });
}
