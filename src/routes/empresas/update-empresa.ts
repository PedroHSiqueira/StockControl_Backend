import { FastifyInstance, FastifyRequest } from "fastify";
import { prisma } from "../../lib/prisma";
import cloudinary from "../../config/cloudinaryConfig";
import { pipeline } from "stream";
import { promisify } from "util";

const pump = promisify(pipeline);

export async function updateEmpresa(app: FastifyInstance) {
  app.put("/empresa/:id/:usuarioId", async (request: FastifyRequest, reply) => {
    try {
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

      const parts = request.parts();
      const fields: Record<string, any> = {};
      let fotoFile: any = null;

      for await (const part of parts) {
        if (part.type === "file" && part.fieldname === "foto") {
          fotoFile = part;
        } else if (part.type === "field") {
          fields[part.fieldname] = part.value === "null" ? null : part.value;
        }
      }

      if (usuario.tipo === "ADMIN") {
        if (fields["nome"] && fields["nome"] !== usuario.empresa.nome) {
          return reply.status(403).send({ mensagem: "ADMIN não pode alterar o nome da empresa" });
        }
        if (fields["email"] && fields["email"] !== usuario.empresa.email) {
          return reply.status(403).send({ mensagem: "ADMIN não pode alterar o email da empresa" });
        }
      }

      let fotoUrl = usuario.empresa.foto;
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
      } else if (fields["foto"] === null) {
        fotoUrl = null;
      }

      const updateData: Record<string, any> = {
        ...(fields["nome"] !== undefined && { nome: fields["nome"]?.trim() }),
        ...(fields["email"] !== undefined && { email: fields["email"]?.trim() }),
        ...(fotoUrl !== undefined && { foto: fotoUrl }),
        ...(fields["telefone"] !== undefined && { telefone: fields["telefone"]?.trim() }),
        ...(fields["endereco"] !== undefined && { endereco: fields["endereco"]?.trim() }),
        ...(fields["pais"] !== undefined && { pais: fields["pais"]?.trim() }),
        ...(fields["estado"] !== undefined && { estado: fields["estado"]?.trim() }),
        ...(fields["cidade"] !== undefined && { cidade: fields["cidade"]?.trim() }),
        ...(fields["cep"] !== undefined && { cep: fields["cep"]?.trim() }),
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
