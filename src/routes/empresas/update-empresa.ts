import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { UnauthorizedError } from "../../exceptions/UnauthorizedError";

export async function updateEmpresa(app: FastifyInstance) {
  app.put("/empresa/:id/upload-foto", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });

      const { id } = request.params as { id: string };
      const userId = request.headers["user-id"] as string;

      if (!userId) {
        return reply.status(401).send({ mensagem: "Usuário não autenticado" });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        include: { empresa: true },
      });

      if (!usuario || !usuario.empresa) {
        return reply.status(404).send({ mensagem: "Usuário ou empresa não encontrados" });
      }

      if (usuario.empresa.id !== id) {
        return reply.status(403).send({ mensagem: "Você não tem permissão para editar esta empresa" });
      }

      if (usuario.tipo === "FUNCIONARIO") {
        return reply.status(403).send({ mensagem: "Funcionários não podem editar dados da empresa" });
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

      if (usuario.empresa.foto) {
        const publicId = usuario.empresa.foto.split("/").pop()?.split(".")[0];
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
      console.error("Erro no upload da foto para update:", error);
      return reply.status(500).send({
        error: "Erro no upload da foto",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.put("/empresa/:id/:usuarioId", async (request: FastifyRequest, reply) => {
    try {
      await request.jwtVerify().catch(() => {
        throw new UnauthorizedError("Token inválido ou expirado");
      });
      const { id, usuarioId } = request.params as { id: string; usuarioId: string };

      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        include: { empresa: true },
      });

      if (!usuario || !usuario.empresa) {
        return reply.status(404).send({ mensagem: "Usuário ou empresa não encontrados" });
      }

      if (usuario.empresa.id !== id) {
        return reply.status(403).send({ mensagem: "Você não tem permissão para editar esta empresa" });
      }

      if (usuario.tipo === "FUNCIONARIO") {
        return reply.status(403).send({ mensagem: "Funcionários não podem editar dados da empresa" });
      }

      const body = request.body as any;
      const { nome, email, telefone, endereco, pais, estado, cidade, cep, fotoUrl } = body;

      if (usuario.tipo === "ADMIN") {
        if (nome && nome !== usuario.empresa.nome) {
          return reply.status(403).send({ mensagem: "ADMIN não pode alterar o nome da empresa" });
        }
        if (email && email !== usuario.empresa.email) {
          return reply.status(403).send({ mensagem: "ADMIN não pode alterar o email da empresa" });
        }
      }

      const updateData: Record<string, any> = {
        ...(nome !== undefined && { nome: nome?.trim() }),
        ...(email !== undefined && { email: email?.trim() }),
        ...(fotoUrl !== undefined && { foto: fotoUrl }),
        ...(telefone !== undefined && { telefone: telefone?.trim() }),
        ...(endereco !== undefined && { endereco: endereco?.trim() }),
        ...(pais !== undefined && { pais: pais?.trim() }),
        ...(estado !== undefined && { estado: estado?.trim() }),
        ...(cidade !== undefined && { cidade: cidade?.trim() }),
        ...(cep !== undefined && { cep: cep?.trim() }),
      };

      const empresaAtualizada = await prisma.empresa.update({
        where: { id: String(id) },
        data: updateData,
      });

      return reply.send(empresaAtualizada);
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error);
      return reply.status(500).send({
        mensagem: "Erro interno no servidor",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
      });
    }
  });
}
