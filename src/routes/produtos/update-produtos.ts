import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { usuarioTemPermissao } from "../../lib/permissaoUtils";
import { UnauthorizedError } from "../../exceptions/UnauthorizedException";

export async function updateProduto(app: FastifyInstance) {
  app.put("/produtos/:id/upload-foto", async (request: FastifyRequest, reply) => {
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

      const produtoExistente = await prisma.produto.findUnique({
        where: { id: Number(id) },
      });

      if (!produtoExistente) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
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
      if (produtoExistente.foto) {
        const publicId = produtoExistente.foto.split("/").pop()?.split(".")[0];
        if (publicId) {
          await cloudinary.uploader.destroy(publicId).catch(console.error);
        }
      }

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
        fileSize: fileBuffer.length,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return reply.status(401).send({ error: error.message });
      }

      return reply.status(500).send({
        error: "Erro no upload da foto",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/produtos/:id", async (request: FastifyRequest, reply) => {
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
      const body = request.body as any;

      const { nome, descricao, preco, quantidadeMin, noCatalogo, categoriaId, fornecedorId, usuarioId, fotoUrl } = body;

      if (!nome || !descricao) {
        return reply.status(400).send({
          mensagem: "Campos obrigatórios faltando: nome, descricao",
        });
      }

      const precoNum = typeof preco === "string" ? parseFloat(preco.replace(",", ".")) : preco;
      const quantidadeMinNum = quantidadeMin ? (typeof quantidadeMin === "string" ? parseInt(quantidadeMin) : quantidadeMin) : null;
      const noCatalogoBool = noCatalogo === "true" || noCatalogo === true;

      if (isNaN(precoNum)) return reply.status(400).send({ mensagem: "Preço inválido" });

      const produtoExistente = await prisma.produto.findUnique({
        where: { id: Number(id) },
      });

      if (!produtoExistente) {
        return reply.status(404).send({ mensagem: "Produto não encontrado" });
      }

      const produtoAtualizado = await prisma.produto.update({
        where: { id: Number(id) },
        data: {
          nome: nome.trim(),
          descricao: descricao.trim(),
          preco: precoNum,
          quantidadeMin: quantidadeMinNum ?? undefined,
          noCatalogo: noCatalogoBool,
          foto: fotoUrl || produtoExistente.foto,
          categoriaId: categoriaId || null,
          fornecedorId: fornecedorId || null,
          usuarioId: usuarioId || userId,
        },
      });

      const logData = {
        empresaId: produtoAtualizado.empresaId,
        descricao: `Produto Atualizado: ${produtoAtualizado.nome}`,
        tipo: "ATUALIZACAO" as const,
        usuarioId: produtoAtualizado.usuarioId,
      };

      await prisma.logs.create({
        data: logData,
      });

      return reply.status(200).send(produtoAtualizado);
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
}
